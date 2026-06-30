import { getApp } from '@zos/app'

App({
  globalData: {},
  onCreate(options) {
    console.log('App onCreate', options)
  },
  onDestroy(options) {
    console.log('App onDestroy', options)
  }
})
