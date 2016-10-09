import {VNode, div, label, input} from '@cycle/dom';
import xs, {Stream} from 'xstream';
import {DOMSource} from '@cycle/dom/xstream-typings';
import isolate from '@cycle/isolate';

import {setBoolean} from '../utils'

export default (props: Sources) => isolate(FlagForm)(props)

type Sources = {
  DOM: DOMSource,
  type: string,
  text: string,
  word$: Stream<Object>,
  answerVisible$: Stream<boolean>,
  resetField$: Stream<setBoolean>,
}
type Sinks = {
  view$: Stream<VNode>,
  enterPress$: Stream<any>
}

function FlagForm(sources : Sources) : Sinks {
  const {DOM, type, text, word$, answerVisible$, resetField$} = sources;

  const modelProxy$ : Stream<setBoolean> = xs.never()
  const model$ = modelProxy$.fold((acc, fn: setBoolean) => fn(acc), false)

  const input$ = DOM.select('.flag-form__checkbox')

  const setValue$ = input$
    .events('change')
    .map(ev => (ev.target as HTMLInputElement).checked)
    .map(v => _ => v)

  const modelImpl$ = xs.merge(
    setValue$,
    resetField$,
  )
  modelProxy$.imitate(modelImpl$)

  const enterPress$ = input$
    .events('keydown')
    .filter(ev => (ev as KeyboardEvent).keyCode === 13)

  // TODO prettify
  const answer$ = word$.map(v => ({true: text, false: ''})[v[type]])

  const props$ = xs.combine(answer$, model$, answerVisible$)

  const view$ = props$.map(props => {
    const [answer, checked, answerVisible] = props;

    return div('.flag-form', [
      label('.flag-form__label', [
        text,
        input('.flag-form__checkbox', {attrs: {type: 'checkbox'}, props: {checked}})
      ]),
      div('.flag-form__answer', {class: {
        'flag-form__answer--correct': answerVisible && answer === checked,
        'flag-form__answer--incorrect': answerVisible && answer !== checked,
      }}, [answer ? text : ' '])
    ])
  })

  //  const actions = intent(sources.DOM);
  //  const state$ = model(actions);
  //  const vdom$ = view(state$);

  return {
    view$,
    enterPress$
  }
}