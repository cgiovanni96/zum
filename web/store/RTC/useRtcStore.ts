import create from 'zustand'

import useProducerStore from './useProducerStore'
import useConsumerStore from './useConsumerStore'

type RtcStore = {
	initTransports: () => void
}

const useRtcStore = create<RtcStore>(() => {
	const initTransports = async () => {
		await useProducerStore.getState().initProducerTransport()
		await useConsumerStore.getState().initConsumerTransport()
	}

	return {
		initTransports
	}
})

export default useRtcStore
