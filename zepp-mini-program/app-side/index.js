import { BaseSideService } from '@zeppos/zml/base-side'
import { fetch } from '@zeppos/fetch'

// The IP Address of your Oracle VM
const ORACLE_WEBHOOK_URL = 'http://68.233.103.229:4080/data'

AppSideService(
  BaseSideService({
    onInit() {
      console.log('SideService initialized')
    },

    onRequest(req, res) {
      console.log('Received data from watch:', req.body)

      // The watch sent us some health data, let's forward it to Oracle Cloud
      if (req.method === 'SYNC_HEALTH_DATA') {
        const payload = req.body

        fetch({
          url: ORACLE_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
          .then((response) => {
            console.log('Successfully sent data to Oracle Cloud:', response.body)
            res(null, { success: true, message: 'Data synced to Oracle' })
          })
          .catch((error) => {
            console.error('Failed to send data to Oracle Cloud:', error)
            res(error, { success: false })
          })
      } else {
        res(null, { success: false, message: 'Unknown method' })
      }
    },

    onDestroy() {
      console.log('SideService destroyed')
    }
  })
)
