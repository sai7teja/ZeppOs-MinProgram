import { createWidget, widget, align, text_style } from '@zos/ui'
import { Pai, Sleep, HeartRate } from '@zos/sensor'
import { BasePage } from '@zeppos/zml/base-page'

Page(
  BasePage({
    state: {
      statusText: 'Initializing...'
    },

    build() {
      console.log('build() started!')
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

      console.log('build() finished!')
    },

    syncData() {
      console.log('syncData triggered!')
      this.textWidget.setProperty(widget.PROP_MORE, { text: 'Reading sensors...' })

      try {
        // 1. Read Health Data from Zepp OS Sensors
        const paiSensor = new Pai()
        const sleepSensor = new Sleep()
        const hrSensor = new HeartRate()

        const paiData = paiSensor.getCurrent()
        const sleepData = sleepSensor.getInfo()
        const hrData = hrSensor.getCurrent()

        const payload = {
          timestamp: new Date().toISOString(),
          pai_total: paiData ? paiData.totalpai : 0,
          sleep_score: sleepData ? sleepData.score : 0,
          heart_rate: hrData ? hrData : 0,
          device: 'Zepp-Watch'
        }

        console.log('Sending payload to phone:', JSON.stringify(payload))

        this.textWidget.setProperty(widget.PROP_MORE, { text: 'Sending to Phone...' })

        // 2. Send to Smartphone (Side Service)
        this.request({
          method: 'SYNC_HEALTH_DATA',
          body: payload
        })
          .then((res) => {
            console.log('Response from phone:', JSON.stringify(res))
            if (res.success) {
              this.textWidget.setProperty(widget.PROP_MORE, { text: 'Success!\nData in BigQuery.' })
            } else {
              this.textWidget.setProperty(widget.PROP_MORE, { text: 'Failed to upload.' })
            }
          })
          .catch((error) => {
            console.log('Error from phone:', error)
            this.textWidget.setProperty(widget.PROP_MORE, { text: 'Network Error!' })
          })

      } catch (e) {
        console.log('Sensor Error:', e)
        this.textWidget.setProperty(widget.PROP_MORE, { text: 'Sensor Error: ' + e.message })
      }
    }
  })
)
