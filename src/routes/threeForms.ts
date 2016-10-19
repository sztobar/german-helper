import xs, {Stream} from 'xstream'
import {VNode, div, button} from '@cycle/dom'
import {DOMSource} from '@cycle/dom/xstream-typings'
import {HTTPSource} from '@cycle/http/xstream-typings'

import {makeThreeFormsDictionary as makeDictionary} from '../dictionary'
import WordForm from '../views/word-form'
import FlagForm from '../views/flag-form'


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
    .events('click')
    .map((ev) => {
      ev.preventDefault()
      return (ev.target as HTMLButtonElement).textContent
    })
    .map(char => v => v + char)

  const nextClick$ = DOM.select('.next')
    .events('click')
    .mapTo('')

  const checkClick$ = DOM.select('.check')
    .events('click')
    .mapTo(true)

  const resetFieldProxy$ = xs.never()
  const resetField$ = resetFieldProxy$.map(() => () => '')

  const answerVisibleProxy$ = xs.never()
  const answerVisible$ = answerVisibleProxy$.startWith(false)

  const modeProxy$ = xs.never()
  const mode$ = modeProxy$.startWith('meaning')

  const nextWord$ = xs.merge(nextClick$, mode$)

  const word$ = sources.HTTP.select('data')
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

  const infinitivWordForm = WordForm({type: 'infinitiv', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})
  const prateriumWordForm = WordForm({type: 'praterium', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})
  const partizip2WordForm = WordForm({type: 'partizip2', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})
  const meaningWordForm = WordForm({type: 'meaning', DOM, word$, mode$, answerVisible$, appendChar$, resetField$})

  const habenFlagForm = FlagForm({type: 'haben', text: 'h', DOM, word$, answerVisible$, resetField$})
  const seinFlagForm = FlagForm({type: 'sein', text: 's', DOM, word$, answerVisible$, resetField$})
  
  const modeImpl$ = xs.merge(
    infinitivWordForm.mode$,
    prateriumWordForm.mode$,
    partizip2WordForm.mode$,
    meaningWordForm.mode$,
  )
  modeProxy$.imitate(modeImpl$)

  const answerVisibleImpl$ = xs.merge(
    infinitivWordForm.enterPress$,
    prateriumWordForm.enterPress$,
    partizip2WordForm.enterPress$,
    meaningWordForm.enterPress$,
    habenFlagForm.enterPress$,
    seinFlagForm.enterPress$,
    checkClick$,
  )
  answerVisibleProxy$.imitate(answerVisibleImpl$)

  const resetFieldImpl$ = xs.merge(
    mode$,
    nextClick$
  )
  resetFieldProxy$.imitate(resetFieldImpl$)


  const view$ = xs.combine(
    infinitivWordForm.view$,
    prateriumWordForm.view$,
    partizip2WordForm.view$,
    meaningWordForm.view$,
    habenFlagForm.view$,
    seinFlagForm.view$,
  )

  return {
    DOM: view$.map(views => {
      const [infinitivView, prateriumView, partizip2View, meaningView, habenView, seinView] = views
      
      return div([
        div([
          button('#ä.add-char', 'ä'),
          button('#ö.add-char', 'ö'),
          button('#ü.add-char', 'ü'),
          button('#ß.add-char', 'ß'),
          button('.check', {style: {float: 'right'}}, 'check'),
          button('.next', {style: {float: 'right'}}, 'next'),
        ]),
        div('.container', {style: {clear: 'both'}}, [
          infinitivView,
          prateriumView,
          partizip2View,
          div('.word-flags', [
            habenView,
            seinView,
          ]),
          meaningView,
        ])
      ])
    }),
    HTTP: xs.of({url: 'data.txt', category: 'data'})
  }
}