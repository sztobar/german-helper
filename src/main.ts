import xs, {Stream} from 'xstream'
import {run} from '@cycle/xstream-run'
import {makeDOMDriver, VNode, div, span, button, input, label, br} from '@cycle/dom'
import {DOMSource} from '@cycle/dom/xstream-typings'
import {makeHTTPDriver} from '@cycle/http'
import {HTTPSource} from '@cycle/http/xstream-typings'

import {makeDictionary} from './dictionary'
import WordForm from './views/word-form'

declare var require: any
require('./styles/main.css')

type Sources = {
  DOM: DOMSource,
  HTTP: HTTPSource
}
type Sinks = {
  DOM: Stream<VNode>,
  HTTP: Stream<VNode>
}
type Model = {
  infinitiv: string,
  praterium: string,
  partizip2: string,
  meaning: string,
  haben: boolean,
  sein: boolean
}

function main(sources: Sources): Sinks {
  const {DOM} = sources
  const specialCharClicks$ = sources.DOM.select('.add-char')
    .events('mousedown')
    .map((ev) => {
      ev.preventDefault()
      return (ev.target as HTMLButtonElement).textContent
    })

  const inputs$ = sources.DOM.select('.word-form__input')

  const focusInputs$ = inputs$
    .events('focus')
    .map(ev => (ev.target as Element).id)

  const blurInputs$ = inputs$
    .events('blur')
    .mapTo(null)

  const activeInput$ = xs.merge(focusInputs$, blurInputs$)

  const appendInput$ : Stream<string[]> = activeInput$
    .map(activeInput => {
      if (!activeInput) {
        return xs.never()
      }
      return specialCharClicks$.map(char =>
        v => Object.assign({}, v, {[activeInput]: v[activeInput] + char})
      )
    })
    .flatten()

  const setInput$ : Stream<(v: string) => string> = inputs$
    .events('input')
    .map(ev => {
      const el = (ev.target as HTMLInputElement)
      return v => Object.assign({}, v, {[el.id]: el.value})
    })

  const nextClick$ = sources.DOM.select('.next')
    .events('click')
    .mapTo('')

  const mode$ = sources.DOM.select('.change-mode')
    .events('click')
    .map(ev => (ev.target as HTMLButtonElement).textContent)
    .startWith('meaning')

  const inputsStartVal = {
    infinitiv: '',
    praterium: '',
    partizip2: '',
    meaning: ''
  }

  const resetInput$ = xs.merge(nextClick$, mode$)
    .map(() => v => Object.assign({}, inputsStartVal))

  const inputModel$ = xs.merge(setInput$, appendInput$, resetInput$)
    .fold((acc: Object, fn) => fn(acc), Object.assign({}, inputsStartVal))

  const setCheckbox$ = sources.DOM.select('.word-form__checkbox')
    .events('change')
    .map((ev) => {
      const el = (ev.target as HTMLInputElement)
      return v => Object.assign({}, v, {[el.id]: el.checked})
    })

  const checkboxesStartVal = {
    haben: false,
    sein: false
  }

  const resetCheckbox$ = xs.merge(nextClick$, mode$)
    .map(() => v => Object.assign({}, checkboxesStartVal))

  const checkboxModel$ = xs.merge(setCheckbox$, resetCheckbox$)
    .fold((acc, fn) => fn(acc), Object.assign({}, checkboxesStartVal))

  const nextWord$ = xs.merge(nextClick$, mode$)

  const words$ : Stream<Model> = sources.HTTP.select('data')
    .flatten()
    .map(result => makeDictionary(result.text))
    .map(words => {
      return nextWord$.map(() => {
        if (!words.length) {
          setTimeout(() => location.reload(), 5000)
          return {meaning: 'wszystko!'}
        }
        const idx = Math.floor(Math.random() * words.length)
        const [removed] = words.splice(idx, 1)
        return removed
      })
    })
    .flatten()

  const model$ = xs.combine(inputModel$, checkboxModel$)
    .map(([inputs, checkboxes]) => {
      return Object.assign({}, inputs, checkboxes)
    })

  const enter$ = sources.DOM.select('.word-form__input, .word-form__checkbox')
    .events('keydown')
    .filter(ev => (ev as KeyboardEvent).keyCode === 13)

    // TODO why new merge and not nextWord$
  const answersState$ = xs.merge(enter$.mapTo(true), xs.merge(nextClick$, mode$).mapTo(false))

  const state$ = xs.combine(model$, words$, mode$, answersState$)

  const sinks = {
    DOM: state$.map(([model, word, mode, answersVisible]) => {
      const modelCopy = Object.assign({}, model, {[mode]: word[mode]})
      const {infinitiv, praterium, partizip2, meaning, haben, sein} = modelCopy
      return div([
        div([
          button('#ä.add-char', 'ä'),
          button('#ö.add-char', 'ö'),
          button('#ü.add-char', 'ü'),
          button('#ß.add-char', 'ß'),
          button('.next', {style: {float: 'right'}}, 'next')
        ]),
        div({style: {clear: 'both'}}, [
          div(`.word-form.word-form--infinitiv`, [
            button('.word-form__mode', {props: {disabled: mode === 'infinitiv', tabIndex: -1}}, 'infinitiv'),
            input(`#infinitiv.word-form__input`, {attrs: {placeholder: 'infinitiv'}, props: {value: infinitiv}}),
            div('.word-form__answer', {class: {'word-form__answer--hidden': !answersVisible}}, [word.infinitiv])
          ]),
          div(`.word-form.word-form--praterium`, [
            button('.word-form__mode', {props: {disabled: mode === 'praterium', tabIndex: -1}}, 'praterium'),
            input(`#praterium.word-form__input`, {attrs: {placeholder: 'praterium'}, props: {value: praterium}}),
            div('.word-form__answer', {class: {'word-form__answer--hidden': !answersVisible}}, [word.praterium])
          ]),
          div(`.word-form.word-form--partizip2`, [
            button('.word-form__mode', {props: {disabled: mode === 'partizip2', tabIndex: -1}}, 'partizip2'),
            input(`#partizip2.word-form__input`, {attrs: {placeholder: 'partizip2'}, props: {value: partizip2}}),
            div('.word-form__answer', {class: {'word-form__answer--hidden': !answersVisible}}, [word.partizip2])
          ]),
          span('.word-form', [
            label(['h', input('#haben.word-form__checkbox', {attrs: {type: 'checkbox'}, props: {checked: haben}})]),
            label(['s', input('#sein.word-form__checkbox', {attrs: {type: 'checkbox'}, props: {checked: sein}})]),
            br(),
            div('.word-form__answer', {class: {'word-form__answer--hidden': !answersVisible}}, [`${word.haben && word.sein ? 'h, s' : word.haben ? 'h' : 's'}`])
          ]),
          div(`.word-form.word-form--meaning`, [
            button('.word-form__mode', {props: {disabled: mode === 'meaning', tabIndex: -1}}, 'meaning'),
            input(`#meaning.word-form__input`, {attrs: {placeholder: 'meaning'}, props: {value: meaning}}),
            div('.word-form__answer', {class: {'word-form__answer--hidden': !answersVisible}}, [word.meaning])
          ])
        ])
      ])
    }),
    HTTP: xs.of({url: 'data.txt', category: 'data'})
  }
  return sinks
}

window.onload = () =>
  run(main, {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver()
  })
