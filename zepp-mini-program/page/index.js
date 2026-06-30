import { createWidget, widget, align, text_style } from '@zos/ui'
import { Pai, Sleep, HeartRate } from '@zos/sensor'
import { BasePage } from '@zeppos/zml/base-page'

const paiSensor = new Pai()
const sleepSensor = new Sleep()
const hrSensor = new HeartRate()

Page(
  BasePage({
    state: {
      statusText: 'Initializing...'
    },

    build() {
      // Create a text widget to show status on the watch face
      this.textWidget = createWidget(widget.TEXT, {
        x: 0,
        y: 120,
        w: 192,
        h: 200,
        color: 0xffffff,
        text_size: 24,
        align_h: align.CENTER_H,
        text_style: text_style.WRAP,
        text: this.state.statusText
      })

      // Create a sync button
      createWidget(widget.BUTTON, {
        x: 10,
        y: 350,
        w: 172,
        h: 60,
        radius: 30,
        normal_color: 0x1890ff,
        press_color: 0x096dd9,
        text: 'Sync to Oracle',
        click_func: () => {
          this.syncData()
        }
      })

      // Auto-sync every time the app is opened
      this.syncData()
    },

    syncData() {
      this.textWidget.setProperty(widget.PROP_MORE, { text: 'Reading sensors...' })

      try {
        // 1. Read Health Data from Zepp OS Sensors
        const paiData = paiSensor.getCurrent() // returns e.g. { dailypai, totalpai }
        const sleepData = sleepSensor.getInfo() // returns e.g. { score, deepTime }
        const hrData = hrSensor.getCurrent() // returns e.g. 75

        const payload = {
          timestamp: new Date().toISOString(),
          pai_total: paiData ? paiData.totalpai : 0,
          sleep_score: sleepData ? sleepData.score : 0,
          heart_rate: hrData ? hrData : 0,
          device: 'Zepp-Watch'
        }

        this.textWidget.setProperty(widget.PROP_MORE, { text: 'Sending to Phone...' })

        // 2. Send to Smartphone (Side Service)
        this.request({
          method: 'SYNC_HEALTH_DATA',
          body: payload
        })
          .then((res) => {
            if (res.success) {
              this.textWidget.setProperty(widget.PROP_MORE, { text: 'Success!\nData in BigQuery.' })
            } else {
              this.textWidget.setProperty(widget.PROP_MORE, { text: 'Failed to upload.' })
            }
          })
          .catch((error) => {
            this.textWidget.setProperty(widget.PROP_MORE, { text: 'Network Error!' })
          })

      } catch (e) {
        this.textWidget.setProperty(widget.PROP_MORE, { text: 'Sensor Error: ' + e.message })
      }
    }
  })
)
