import xs, {Stream} from 'xstream'
import {VNode, div, button} from '@cycle/dom'
import {DOMSource} from '@cycle/dom/xstream-typings'
import {HTTPSource} from '@cycle/http/xstream-typings'

import {makePairsDictionary as makeDictionary} from '../dictionary'
import WordForm from '../views/word-form'

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

  const appendChar$ = DOM.select('.add-char')
    .events('mousedown')
    .map((ev) => {
      ev.preventDefault()
      return (ev.target as HTMLButtonElement).textContent
    })
    .map(char => v => v + char)

  const nextClick$ = DOM.select('.next')
    .events('click')
    .mapTo('')

  const resetFieldProxy$ = xs.never()
  const resetField$ = resetFieldProxy$.map(() => () => '')

  const answerVisibleProxy$ = xs.never()
  const answerVisible$ = answerVisibleProxy$.startWith(false)

  const modeProxy$ = xs.never()
  const mode$ = modeProxy$.startWith('meaning')

  const nextWord$ = xs.merge(nextClick$, mode$).remember()

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

  const germanWordForm = WordForm({type: 'german', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})
  const meaningWordForm = WordForm({type: 'meaning', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})

  const modeImpl$ = xs.merge(
    germanWordForm.mode$,
    meaningWordForm.mode$,
  )
  modeProxy$.imitate(modeImpl$)

  const answerVisibleImpl$ = xs.merge(
    xs.merge(
      germanWordForm.enterPress$,
      meaningWordForm.enterPress$,
    ).mapTo(true),
    nextWord$.mapTo(false),
  )
  answerVisibleProxy$.imitate(answerVisibleImpl$)


  const resetFieldImpl$ = xs.merge(
    mode$,
    nextClick$
  )
  resetFieldProxy$.imitate(resetFieldImpl$)


  const view$ = xs.combine(
    germanWordForm.DOM,
    meaningWordForm.DOM,
  )

  return {
    DOM: view$.map(views => {
      const [germanView, prateriumView] = views
      
      return div([
        div([
          button('#ä.add-char', 'ä'),
          button('#ö.add-char', 'ö'),
          button('#ü.add-char', 'ü'),
          button('#ß.add-char', 'ß'),
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