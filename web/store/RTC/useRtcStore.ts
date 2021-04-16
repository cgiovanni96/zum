import create from 'zustand'

import useProducerStore from './useProducerStore'
import useConsumerStore from './useConsumerStore'

type RtcStore = {
	initTransports: () => void
}

const useRtcStore = create<RtcStore>(() => {
	const producerStore = useProducerStore()
	const consumerStore = useConsumerStore()

	const initTransports = async () => {
		await producerStore.initProducerTransport()
		await consumerStore.initConsumerTransport()
	}

	return {
		initTransports
	}
})

export default useRtcStore
