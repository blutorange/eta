/* global it, expect, describe */

import * as Eta from '../src/index'
import { buildRegEx } from './err.spec'

type AsyncTimes = {time: number, type: "start" | "end"}[]

function resolveAfter20Milliseconds(val: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(val)
    }, 20)
  })
}

function createWaitAndStoreTimes(times: AsyncTimes): (val: string) => Promise<string> {
  return val => new Promise<string>((resolve) => {
    times.push({time: Date.now(), type: 'start'});
      setTimeout(() => {
        resolve(val)
      }, 200)
  }).then(x => {
    times.push({time: Date.now(), type: 'end'});
    return x;
  })
}

async function asyncTest() {
  const result = await resolveAfter20Milliseconds('HI FROM ASYNC')
  return result
}

describe('Async Render checks', () => {
  describe('Async works', () => {
    it('Simple template compiles asynchronously', async () => {
      expect(
        await Eta.render('Hi <%= it.name %>', { name: 'Ada Lovelace' }, { async: true })
      ).toEqual('Hi Ada Lovelace')
    })

    it('Simple template compiles asynchronously with callback', (done) => {
      function cb(_err: Error | null, res?: string) {
        expect(res).toEqual(res)
        done()
      }
      Eta.render('Hi <%= it.name %>', { name: 'Ada Lovelace' }, { async: true }, cb)
    })

    it('Async function works', async () => {
      expect(
        await Eta.render(
          '<%= await it.asyncTest() %>',
          { name: 'Ada Lovelace', asyncTest: asyncTest },
          { async: true }
        )
      ).toEqual('HI FROM ASYNC')
    })

    it('Async template w/ syntax error throws', async () => {
      await expect(async () => {
        await Eta.render('<%= @#$%^ %>', {}, { async: true })
      }).rejects.toThrow(
        buildRegEx(`
var tR='',__l,__lP,include=E.include.bind(E),includeFile=E.includeFile.bind(E)
function layout(p,d){__l=p;__lP=d}
tR+=E.e(@#$%^)
if(__l)tR=await includeFile(__l,Object.assign(it,{body:tR},__lP))
if(cb){cb(null,tR)} return tR
`)
      )
    })

    it('does not await code in eval tags with globalAwait option', async () => {
      expect(
        await Eta.render('Hi <% if (it.name) { %>0<% } %>', { name: Promise.resolve(false) }, { async: true, globalAwait: true })
      ).toEqual('Hi 0')
    })

    it('automatically awaits promises with the globalAwait option', async () => {
      expect(
        await Eta.render('Hi <%= it.name %>', { name: Promise.resolve('Ada Lovelace') }, { async: true, globalAwait: true })
      ).toEqual('Hi Ada Lovelace')
    })

    it('globalAwait option works with an empty interpolation tag', async () => {
      expect(
        await Eta.render('Hi <%=%>', { }, { async: true, globalAwait: true })
      ).toEqual('Hi undefined')
    })

    it('awaits all promises in parallel with the globalAwait option (escaped)', async () => {
      const times: AsyncTimes =  [];
      const wait = createWaitAndStoreTimes(times)
      const result = await Eta.render('Hi <%= it.wait(1) %> <%= it.wait(2) %> <%= it.wait(3) %>', { wait }, { async: true, globalAwait: true })
      expect(result).toEqual('Hi 1 2 3')
      times.sort((t1, t2) => t1.time < t2.time ? -1 : t1.time > t2.time ? 1 : 0)
      expect(times.map(t => t.type).join(',')).toBe('start,start,start,end,end,end')
    })

    it('awaits all promises in sequence without the globalAwait option (escaped)', async () => {
      const times: AsyncTimes =  [];
      const wait = createWaitAndStoreTimes(times)
      const result = await Eta.render('Hi <%= await it.wait(1) %> <%= await it.wait(2) %> <%= await it.wait(3) %>', { wait }, { async: true, globalAwait: false })
      expect(result).toEqual('Hi 1 2 3')
      times.sort((t1, t2) => t1.time < t2.time ? -1 : t1.time > t2.time ? 1 : 0)
      expect(times.map(t => t.type).join(',')).toBe('start,end,start,end,start,end')
    })

    it('awaits all promises in parallel with the globalAwait option (raw)', async () => {
      const times: AsyncTimes =  [];
      const wait = createWaitAndStoreTimes(times)
      const result = await Eta.render('Hi <%~ it.wait(1) %> <%~ it.wait(2) %> <%~ it.wait(3) %>', { wait }, { async: true, globalAwait: true })
      expect(result).toEqual('Hi 1 2 3')
      times.sort((t1, t2) => t1.time < t2.time ? -1 : t1.time > t2.time ? 1 : 0)
      expect(times.map(t => t.type).join(',')).toBe('start,start,start,end,end,end')
    })

    it('awaits all promises in sequence without the globalAwait option (raw)', async () => {
      const times: AsyncTimes =  [];
      const wait = createWaitAndStoreTimes(times)
      const result = await Eta.render('Hi <%~ await it.wait(1) %> <%~ await it.wait(2) %> <%~ await it.wait(3) %>', { wait }, { async: true, globalAwait: false })
      expect(result).toEqual('Hi 1 2 3')
      times.sort((t1, t2) => t1.time < t2.time ? -1 : t1.time > t2.time ? 1 : 0)
      expect(times.map(t => t.type).join(',')).toBe('start,end,start,end,start,end')
    })
    it('Async template w/ syntax error passes error to callback', (done) => {
      function cb(err: Error | null, _res?: string) {
        expect(err).toBeTruthy()
        expect((err as Error).message).toMatch(
          buildRegEx(`
var tR='',__l,__lP,include=E.include.bind(E),includeFile=E.includeFile.bind(E)
function layout(p,d){__l=p;__lP=d}
tR+=E.e(@#$%^)
if(__l)tR=await includeFile(__l,Object.assign(it,{body:tR},__lP))
if(cb){cb(null,tR)} return tR
`)
        )
        done()
      }

      Eta.render('<%= @#$%^ %>', {}, { name: 'Ada Lovelace', async: true }, cb)
    })
  })
})

describe('Async Loops', () => {
  // TODO
})
