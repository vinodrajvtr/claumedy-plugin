import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { JokeMode, claumedyJokeState } from '../types'

const claumedyState = atom({ plugin: 'claumedy', key: 'state' } as const, {
  currentJoke: '',
  jokeIndex: 0,
  mode: 'standup',
  promptText: '',
  turnId: null,
  isSpinning: false
})

const JOKES_BY_MODE = {
  standup: [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "I told my computer I needed a break and it said I will go to sleep mode.",
    "Why don't programmers like nature? It has too many bugs.",
    "Debugging: Being the detective in a crime movie where you are also the murderer.",
    "I asked my code why it was sad it said I have too many issues.",
    "Why did the programmer quit his job? He did not get arrays.",
    "How many programmers does it take to change a light bulb? None that is a hardware problem.",
    "I am reading a book about anti-gravity it is impossible to put down!",
    "Why do Java developers wear glasses? Because they do not see sharp.",
    "I would tell you a UDP joke but you might not get it."
  ],
  oneLiner: [
    "I put my phone in airplane mode but it did not fly.",
    "Why was the JavaScript developer sad? He did not know how to null his feelings.",
    "I named my hard drive dat ass so once a month my computer asks if it wants to dat ass.",
    "There are 10 types of people: those who understand binary and those who do not.",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "Why did the developer go broke? Because he used up all his cache.",
    "I am not lazy I am in energy-saving mode.",
    "My code does not have bugs it is just developing random features.",
    "Why do programmers always mix up Halloween and Christmas? Because Oct 31 = Dec 25.",
    "I would tell you a UDP joke but I am afraid you might not get it."
  ],
  roast: [
    "Your code is so bad even Stack Overflow will not help you.",
    "I have seen better logic in a choose your own adventure book.",
    "Your code has more bugs than a kid bedroom in summer.",
    "Did you test this with actual humans or just your cat walking on the keyboard?",
    "This is not code it is abstract art that happens to compile.",
    "If your code was a car it would fail the emissions test.",
    "I have seen better error handling in a toaster manual.",
    "Your documentation is about as helpful as a screen door on a submarine.",
    "This algorithm makes bubble sort look like a quantum leap.",
    "Your code comments are lies and your variable names are fictional characters."
  ],
  encouragement: [
    "You have got this Every expert was once a beginner who did not quit.",
    "Bugs are just features waiting to be discovered keep going!",
    "The fact that you are debugging means you care about quality code.",
    "Every line you write brings you closer to mastery one step at a time.",
    "Remember even the tallest oak was once a nut that held its ground.",
    "Your persistence is the secret sauce that turns struggle into strength.",
    "When code gets tough the tough get refactoring.",
    "You are not stuck you are just loading the next level of your skills.",
    "Every expert programmer has a graveyard of failed projects behind them.",
    "The only way to do great work is to love what you are doing keep loving it!"
  ]
}

function getRandomJoke(mode) {
  const jokes = JOKES_BY_MODE[mode]
  return jokes[Math.floor(Math.random() * jokes.length)]
}

function getNextJoke(state) {
  const jokes = JOKES_BY_MODE[state.mode]
  if (state.jokeIndex >= jokes.length) {
    state.jokeIndex = 0
    jokes.reverse()
  }
  const joke = jokes[state.jokeIndex]
  state.jokeIndex++
  return joke
}

export const register: Register = (on, options) => {
  let isActivelySpinning = false
  let currentTimeout = null
  
  on('prompt.submit', async ($, e, next) => {
    await update($, claumedyState, state => ({
      ...state,
      promptText: e.text,
      turnId: e.turnId ?? null
    }))
    return next(e)
  })
  
  on('turn.start', async ($, e, next) => {
    await update($, claumedyState, state => ({
      ...state,
      turnId: e.turnId,
      isSpinning: true
    }))
    isActivelySpinning = true
    
    if (currentTimeout) clearTimeout(currentTimeout)
    currentTimeout = setTimeout(async () => {
      if (!isActivelySpinning) return
      
      await update($, claumedyState, state => {
        const jokeMode = options?.jokeMode || 'standup'
        return {
          ...state,
          currentJoke: getNextJoke({ ...state, mode: jokeMode }),
          mode: jokeMode
        }
      })
      
      if (isActivelySpinning) {
        currentTimeout = setTimeout(arguments.callee, 3000 + Math.random() * 2000)
      }
    }, 2000)
    
    return next(e)
  })
  
  on('turn.complete', async ($, e, next) => {
    await update($, claumedyState, state => ({
      ...state,
      isSpinning: false,
      currentJoke: '',
      jokeIndex: 0
    }))
    isActivelySpinning = false
    if (currentTimeout) {
      clearTimeout(currentTimeout)
      currentTimeout = null
    }
    return next(e)
  })
  
  // turn.step is a streaming event - must use async generator
  on('turn.step', async function* ($, e, next) {
    if (e.kind === 'stop') {
      await update($, claumedyState, state => ({
        ...state,
        isSpinning: false,
        currentJoke: '',
        jokeIndex: 0
      }))
      isActivelySpinning = false
      if (currentTimeout) {
        clearTimeout(currentTimeout)
        currentTimeout = null
      }
    }
    yield* next(e)
  })
  
  on('ui.render', { component: 'Spinner' }, async ($, e) => {
    const state = await read($, claumedyState)
    
    if (!state.isSpinning || !state.currentJoke) {
      return next(e)
    }
    
    const { Box, Text } = $.ui.resolve(e)
    
    let suffix = ''
    switch (state.mode) {
      case 'standup':
        suffix = '...'
        break
      case 'oneLiner':
        suffix = '.'
        break
      case 'roast':
        suffix = ' 😏'
        break
      case 'encouragement':
        suffix = ' 💪'
        break
    }
    
    return (
      <Box flexDirection='row'>
        <Text dimColor>{state.currentJoke}{suffix}</Text>
      </Box>
    )
  })
}
