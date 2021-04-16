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
		await get().device.load({ routerRtpCapabilities: RtpCapabilities })
	}
}))

export default useDeviceStore
