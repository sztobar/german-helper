import {VNode, div, button} from '@cycle/dom';
import xs, {Stream} from 'xstream';
import {DOMSource} from '@cycle/dom/xstream-typings';
import isolate from '@cycle/isolate';

import {setString} from '../utils'

// export default (props: Sources) => isolate(CharBtns)(props)
export default CharBtns

type Sources = {
  DOM: DOMSource,
}
type Sinks = {
  DOM: Stream<VNode>,
  appendChar$: Stream<setString>
}

function CharBtns(sources: Sources) : Sinks {
  const {DOM} = sources

  const shiftKeyUp$ = DOM.select('document')
    .events('keydown')
    .filter(e => (e as KeyboardEvent).shiftKey)
    .mapTo(true)

  const shiftKeyDown$ = DOM.select('document')
    .events('keyup')
    .filter(e => !(e as KeyboardEvent).shiftKey)
    .mapTo(false)

  const shiftKey$ = xs.merge(
    shiftKeyUp$,
    shiftKeyDown$
  )
  .startWith(false)

  const appendChar$ = DOM.select('.add-char')
    .events('mousedown')
    .map((ev) => {
      ev.preventDefault()
      return (ev.target as HTMLButtonElement).textContent
    })
    .map(char => v => v + char)

  const view$ = shiftKey$.map(shiftKey => {
    return div({style: {float: 'left'}}, ['ä', 'ö', 'ü', 'ß'].map(c =>
      button(`#${c}.add-char`, shiftKey ? c.toUpperCase() : c)
    ))
  })

  //  const actions = intent(sources.DOM);
  //  const state$ = model(actions);
  //  const vdom$ = view(state$);

  return {
    DOM: view$,
    appendChar$
  }
}