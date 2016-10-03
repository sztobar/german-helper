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

Object.assign(window, {
  xs,
  list: {
    next: v => {
      debugger
      console.log(`next: ${v.valueOf()}`)
    },
    error: v => console.log(`err: ${v}`),
    complete: v => console.log(`complete: ${v}`)
  }
})

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
type setString = (v: string) => string

function createWordForm(type, DOM, words$, mode$, answersVisible$, specialCharClicks$, resetFields$ : Stream<setString>) {
  const modelProxy$ : Stream<setString> = xs.of(() => '')
  const props$ = xs.combine(
    xs.of(type),
    words$.map(v => v[type]),
    modelProxy$.fold((acc, fn: setString) => fn(acc), ''),
    mode$,
    answersVisible$
  ).map(([type, answer, model, mode, answersVisible]) => ({type, answer, model, mode, answersVisible}))
  const wordForm = WordForm({DOM, props$}, type)

  const appendChar$ : Stream<setString> = wordForm.active$
    .map(activeInput => {
      // TODO crusade on if - eliminate it, deus vult
      if (!activeInput) {
        return xs.never()
      }
      return specialCharClicks$.map(char => v => v + char)
    })
    .flatten()

  modelProxy$.imitate(
    xs.merge(
      wordForm.setValue$,
      appendChar$,
      resetFields$,
    )
  )

  return Object.assign({}, wordForm, {model$: modelProxy$})
}

function main(sources: Sources): Sinks {
  const {DOM} = sources

  const specialCharClicks$ = sources.DOM.select('.add-char')
    .events('mousedown')
    .map((ev) => {
      ev.preventDefault()
      return (ev.target as HTMLButtonElement).textContent
    })


  // const setCheckbox$ = sources.DOM.select('.checkbox')
  //   .events('change')
  //   .map((ev) => {
  //     const el = (ev.target as HTMLInputElement)
  //     return v => Object.assign({}, v, {[el.id]: el.checked})
  //   })

  // const checkboxesStartVal = {
  //   haben: false,
  //   sein: false
  // }

  // const resetCheckbox$ = xs.merge(nextClick$, mode$)
  //   .map(() => v => Object.assign({}, checkboxesStartVal))

  // const checkboxModel$ = xs.merge(setCheckbox$, resetCheckbox$)
  //   .fold((acc, fn) => fn(acc), Object.assign({}, checkboxesStartVal))

  const nextClick$ = sources.DOM.select('.next')
    .events('click')
    .mapTo('')

  const resetFieldsProxy$ = xs.never()
  const resetFields$ = resetFieldsProxy$.map(() => () => '')

  const answersVisibleProxy$ = xs.never()
  const answersVisible$ = answersVisibleProxy$.startWith(false)

  const modeProxy$ = xs.never()
  const mode$ = modeProxy$.startWith('meaning')

  const nextWord$ = xs.merge(nextClick$, mode$)

  const words$ : Stream<Model> = sources.HTTP.select('data')
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

  const infinitivWordForm = createWordForm('infinitiv', DOM, words$, mode$, answersVisible$, specialCharClicks$, resetFields$);
  const prateriumWordForm = createWordForm('praterium', DOM, words$, mode$, answersVisible$, specialCharClicks$, resetFields$);
  const partizip2WordForm = createWordForm('partizip2', DOM, words$, mode$, answersVisible$, specialCharClicks$, resetFields$);
  const meaningWordForm = createWordForm('meaning', DOM, words$, mode$, answersVisible$, specialCharClicks$, resetFields$);

  const modeImpl$ = xs.merge(
    infinitivWordForm.mode$,
    prateriumWordForm.mode$,
    partizip2WordForm.mode$,
    meaningWordForm.mode$,
  )
  modeProxy$.imitate(modeImpl$)

  const answersVisibleImpl$ = xs.merge(
    infinitivWordForm.enterPress$,
    prateriumWordForm.enterPress$,
    partizip2WordForm.enterPress$,
    meaningWordForm.enterPress$,
  )
  answersVisibleProxy$.imitate(answersVisibleImpl$)

  const resetFieldsImpl$ = xs.merge(
    mode$,
    nextClick$
  )
  resetFieldsProxy$.imitate(resetFieldsImpl$)


  const view$ = xs.combine(
    infinitivWordForm.DOM,
    prateriumWordForm.DOM,
    partizip2WordForm.DOM,
    meaningWordForm.DOM,
  )

  return {
    DOM: view$.map(([infinitivVDom, prateriumVDom, partizip2VDom, meaningVDom]) => {
      // const modelCopy = Object.assign({}, model, {[mode]: word[mode]})
      // const {infinitiv, praterium, partizip2, meaning, haben, sein} = modelCopy
      return div([
        div([
          button('#ä.add-char', 'ä'),
          button('#ö.add-char', 'ö'),
          button('#ü.add-char', 'ü'),
          button('#ß.add-char', 'ß'),
          button('.next', {style: {float: 'right'}}, 'next')
        ]),
        div({style: {clear: 'both'}}, [
          infinitivVDom,
          prateriumVDom,
          partizip2VDom,
          // span('.word-block', [
          //   label(['h', input('#haben.checkbox', {attrs: {type: 'checkbox'}, props: {checked: haben}})]),
          //   label(['s', input('#sein.checkbox', {attrs: {type: 'checkbox'}, props: {checked: sein}})]),
          //   br(),
          //   div({class: {'answer-hidden': !answersVisible}}, [`${word.haben && word.sein ? 'h, s' : word.haben ? 'h' : 's'}`])
          // ]),
          meaningVDom,
        ])
      ])
    }),
    HTTP: xs.of({url: 'data.txt', category: 'data'})
  }
}

window.onload = () =>
  run(main, {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver()
  })

function _main({DOM}) {
  function Component({DOM, props$}, id) {
    const setInput$ = DOM.select(`#${id}`)
      .events('input')
      .map(ev => (ev.target as HTMLInputElement).value)
      .map(v => () => v)

    const value$ = props$.map(v => v.model)
      .fold((acc, fn: (string) => string) => fn(acc), '')
      .startWith('')

    return {
      DOM: value$.map((value) => {
        return div([
          input(`#${id}`, {props: {value}}),
          span([value])
        ])
      }),
      setInput$
    }
  }

  const clearInput$ = DOM.select('.clear')
    .events('click')
    .mapTo(() => '')
  const stateProxy$ = xs.create()
  const props$ = stateProxy$.map(model => ({model}))
  const component = Component({DOM, props$}, 'one')
  const state$: Stream<any> = xs.merge(clearInput$, component.setInput$)
  stateProxy$.imitate(state$)

  const state2Proxy$ = xs.create()
  const props2$ = state2Proxy$.map(model => ({model}))
  const component2 = Component({DOM, props$: props2$}, 'two')
  const state2$: Stream<any> = xs.merge(clearInput$, component2.setInput$)
  state2Proxy$.imitate(state2$)

  const view$ = xs.combine(component.DOM, component2.DOM)

  return {
    DOM: view$.map(([view, view2]) => {
      return div([
        view,
        view2,
        button('.clear', 'clear')
      ])
    }),
    HTTP: xs.of({url: 'data.txt', category: 'data'})
  }
}