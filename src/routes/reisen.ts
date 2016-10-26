import xs, {Stream} from 'xstream'
import {VNode, div, button} from '@cycle/dom'
import {DOMSource} from '@cycle/dom/xstream-typings'
import {HTTPSource} from '@cycle/http/xstream-typings'

import {makePairsDictionary as makeDictionary} from '../dictionary'
import WordForm from '../views/word-form'
import CharBtns from '../views/char-btns'

type Sources = {
  DOM: DOMSource,
  HTTP: HTTPSource
}
type Sinks = {
  DOM: Stream<VNode>,
  HTTP: Stream<VNode>
}

export default function main(sources: Sources): Sinks {
  const {DOM} = sources

  // const appendChar$ = DOM.select('.add-char')
  //   .events('mousedown')
  //   .map((ev) => {
  //     ev.preventDefault()
  //     return (ev.target as HTMLButtonElement).textContent
  //   })
  //   .map(char => v => v + char)

  const nextClick$ = DOM.select('.next')
    .events('mousedown')
    .map((ev) => {
      ev.preventDefault()
      return ''
    })

  const resetFieldProxy$ = xs.never()
  const resetField$ = resetFieldProxy$.map(() => () => '')

  const answerVisibleProxy$ = xs.never()
  const answerVisible$ = answerVisibleProxy$.startWith(false)

  const modeProxy$ = xs.never()
  const mode$ = modeProxy$.startWith('meaning')

  const secondEnter$ = xs.never()

  const nextWord$ = xs.merge(nextClick$, mode$, secondEnter$).remember()

  const word$ = sources.HTTP.select('reisen')
    .flatten()
    .map(result => makeDictionary(result.text))
    .map(words => {
      return nextWord$.map(() => {
        if (!words.length) {
          return {meaning: 'wszystko!'}
        }
        const idx = Math.floor(Math.random() * words.length)
        const [removed] = words.splice(idx, 1)
        return removed
      })
    })
    .flatten()

  const charBtns = CharBtns({DOM})

  const {appendChar$} = charBtns

  const germanWordForm = WordForm({type: 'german', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})
  const meaningWordForm = WordForm({type: 'meaning', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})

  const modeImpl$ = xs.merge(
    germanWordForm.mode$,
    meaningWordForm.mode$,
  )
  modeProxy$.imitate(modeImpl$)

  const enterPresses$ = xs.merge(
    germanWordForm.enterPress$,
    meaningWordForm.enterPress$,
  ) 

  const answerVisibleImpl$ = xs.merge(
    enterPresses$.mapTo(true),
    nextWord$.mapTo(false),
  )
  answerVisibleProxy$.imitate(answerVisibleImpl$)

  const secondEnterImpl$ = answerVisible$.map(v => {
    if (v) {  // TODO: if crusade
      return enterPresses$ 
    } else {
      return xs.never()
    }
  })
  .flatten()
  secondEnter$.imitate(secondEnterImpl$)

  // const resetFieldImpl$ = xs.merge(
  //   mode$,
  //   nextClick$
  // )
  // resetFieldProxy$.imitate(resetFieldImpl$)
  resetFieldProxy$.imitate(xs.merge(nextClick$, mode$, secondEnter$))

  const view$ = xs.combine(
    charBtns.DOM,
    germanWordForm.DOM,
    meaningWordForm.DOM,
  )

  return {
    DOM: view$.map(views => {
      const [charBtns, germanView, prateriumView] = views
      
      return div([
        div([
          charBtns,
          button('.next', {style: {float: 'right'}}, 'next')
        ]),
        div('.container', {style: {clear: 'both'}}, [
          germanView,
          prateriumView,
        ])
      ])
    }),
    HTTP: xs.of({url: 'reisen.txt', category: 'reisen'})
  }
}