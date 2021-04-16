import { Device } from 'mediasoup-client'
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'
import create from 'zustand'

type DeviceStore = {
	device: Device
	loadDevice: (rtpCapabilities: RtpCapabilities) => void
}

const useDeviceStore = create<DeviceStore>((set, get) => ({
	device: null,
	loadDevice: async (RtpCapabilities: RtpCapabilities) => {
		const newDevice = new Device()
		try {
			await newDevice.load({
				routerRtpCapabilities: RtpCapabilities
			})
		} catch (e) {
			console.log('not supported', e)
		}

		set(() => ({ device: newDevice }))
		console.log('device loaded', get().device)
	}
}))

export default useDeviceStore
