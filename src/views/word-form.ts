import {VNode, div, button, input} from '@cycle/dom';
import xs, {Stream} from 'xstream';
import {DOMSource} from '@cycle/dom/xstream-typings';
import isolate from '@cycle/isolate';

import {setString} from '../utils'

export default (props: Sources) => isolate(WordForm)(props);

type Sources = {
  DOM: DOMSource,
  type: string,
  word$: Stream<Object>,
  mode$: Stream<string>,
  answerVisible$: Stream<boolean>,
  resetField$: Stream<setString>,
  appendChar$: Stream<setString>
};
type Sinks = {
  DOM: Stream<VNode>,
  mode$: Stream<string>,
  enterPress$: Stream<any>
};

function WordForm(sources : Sources) : Sinks {
  const {DOM, type, word$, mode$, answerVisible$, resetField$, appendChar$} = sources;

  const modelProxy$ : Stream<setString> = xs.of(() => '')
  const model$ = modelProxy$.fold((acc, fn: setString) => fn(acc), '')

  const input$ = DOM.select('.word-form__input')

  const focusInput$ : Stream<setString> = input$
    .events('focus')
    .mapTo(appendChar$)
    .flatten()

  const blurInput$ = input$
    .events('blur')
    .map(_ => v => v)
    // .flatten()

  const appendCharWhenActive$ : Stream<setString> = xs.merge(focusInput$, blurInput$)
    
  const setValue$ = input$
    .events('input')
    .map(ev => (ev.target as HTMLInputElement).value)
    .map((v : string) => (_: string) => v)

  const modelImpl$ = xs.merge(
    setValue$,
    appendCharWhenActive$,
    resetField$,
  )
  modelProxy$.imitate(modelImpl$)

  const enterPress$ = input$
    .events('keydown')
    .map(function(v) {
      return v;
    })
    .filter(ev => (ev as KeyboardEvent).keyCode === 13)

  const setMode$ = DOM.select('.word-form__mode')
    .events('click')
    .mapTo(type)

  const answer$ = word$.map(v => v[type])

  const props$ = xs.combine(answer$, model$, mode$, answerVisible$)

  const view$ = props$.map(props => {
    const [answer, model, mode, answerVisible] = props;
    const disabled = mode === type;
    const value = !disabled ? model : answer; 

    return div(`.word-form`, [
      button('.word-form__mode', {props: {disabled, tabIndex: -1}}, type),
      input(`.word-form__input`, {attrs: {placeholder: type}, props: {value}}),
      div('.word-form__answer', {class: {
        'flag-form__answer--correct': !disabled && answerVisible && answer === value,
        'flag-form__answer--incorrect': !disabled && answerVisible && answer !== value,
      }}, [answer])
    ])
  })

  //  const actions = intent(sources.DOM);
  //  const state$ = model(actions);
  //  const vdom$ = view(state$);

  return {
    DOM: view$,
    mode$: setMode$,
    enterPress$
  }
}