import xs, {Stream} from 'xstream'
import {run} from '@cycle/xstream-run'
import {makeDOMDriver} from '@cycle/dom'
import {makeHTTPDriver} from '@cycle/http'

import reisen from './routes/reisen'
import threeForms from './routes/threeForms'

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

window.onload = () =>
  run(threeForms, {
    DOM: makeDOMDriver('#app'),
    HTTP: makeHTTPDriver()
  })