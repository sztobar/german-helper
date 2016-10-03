import {VNode, div, button, input} from '@cycle/dom';
import xs, {Stream} from 'xstream';
import {DOMSource} from '@cycle/dom/xstream-typings';
import isolate from '@cycle/isolate';

export default (sources, type) => isolate(WordForm)(sources, type);

type Props = {
  type: string,
  answer: string,
  model: string,
  mode: string,
  answersVisible: boolean
};
type Sources = {
  DOM: DOMSource,
  props$: Stream<Props>
};
type Sinks = {
  DOM: Stream<VNode>,
  setValue$: Stream<(_: string) => string>,
  mode$: Stream<string>,
  active$: Stream<string>,
  enterPress$: Stream<any>
};

function WordForm({DOM: domSource, props$} : Sources, type) : Sinks {

  const input$ = domSource.select('.word-form__input')

  const focusInput$ = input$
    .events('focus')
    .map(ev => (ev.target as Element).id)

  const blurInput$ = input$
    .events('blur')
    .mapTo(null)

  const active$ = xs.merge(focusInput$, blurInput$)

  const enterPress$ = input$
    .events('keydown')
    .filter(ev => (ev as KeyboardEvent).keyCode === 13)

  const setValue$ = input$
    .events('input')
    .map(ev => (ev.target as HTMLInputElement).value)
    .map((v : string) => (_: string) => v)

  const mode$ = domSource.select('.word-form__mode')
    .events('click')
    .map(ev => type)//props$.map(v => v.type))
    //.flatten()


  const view$ = props$.map(props => {
    const {type, answer, model, mode, answersVisible} = props;
    const value = mode !== type ? model : answer; 

    return div(`.word-form.word-form--${type}`, [
      button('.word-form__mode', {props: {disabled: mode === type, tabIndex: -1}}, type),
      input(`#${type}.word-form__input`, {attrs: {placeholder: type}, props: {value}}),
      div('.word-form__answer', {class: {'answer-hidden': !answersVisible}}, [answer])
    ])
  })

  //  const actions = intent(sources.DOM);
  //  const state$ = model(actions);
  //  const vdom$ = view(state$);

  return {
    DOM: view$,
    setValue$,
    mode$,
    active$,
    enterPress$
  }
}