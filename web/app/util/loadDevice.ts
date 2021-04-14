import mediasoupClient from 'mediasoup-client'
import { Device } from 'mediasoup-client/lib/Device'
import { SetDevice } from './connect'

const loadDevice = async (
	routerRtpCapabilities,
	setDevice: SetDevice
): Promise<void> => {
	let device: Device
	try {
		device = new mediasoupClient.Device()
	} catch (error) {
		if (error.name === 'UnsupportedError') {
			console.error('browser not supported')
		}
	}
	await device.load({ routerRtpCapabilities })
	setDevice(device)
}

export default loadDevice
