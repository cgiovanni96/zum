// import { Consumer } from 'mediasoup-client/lib/Consumer'
// import { Producer } from 'mediasoup-client/lib/Producer'

import React, { useEffect, useState } from 'react'
import { MediaType } from '../store/RTC/types'
import Media from '../components/Media'
import useProducerStore from '../store/RTC/useProducerStore'
import useRoomStore from '../store/useRoomStore'
import useSocketStore from '../store/useSocketStore'

const Room2: React.FC = () => {
	const [userName, setUserName] = useState<string>('')
	const roomStore = useRoomStore()
	const producerStore = useProducerStore()
	const socketStore = useSocketStore()
	// const consumerStore = useConsumerStore()

	useEffect(() => {
		setUserName(`nassarolo-${Math.round(Math.random() * 1000)}`)
		roomStore.initializeRoom('123', 'nassa')

		console.log(roomStore)
	}, [])

	const getVideo = () => {
		console.log('producers', roomStore.personalStream)
		producerStore.produce(MediaType.video)
		console.log('producers post ', roomStore.personalStream)
	}

	const checkSocket = () => {
		console.log('socket: ', socketStore.socket)
	}

	return (
		<>
			<div>{userName} </div>
			<div id="control">
				<button onClick={() => roomStore.exit(false)}>Exit</button>
				<br />

				<button onClick={() => getVideo()}>video</button>
				<button>close video</button>
				<button>screen</button>
				<button>close screen</button>

				<button onClick={() => checkSocket()}>check socket </button>
				<br />
			</div>

			{roomStore.personalStream && <Media media={roomStore.personalStream} />}

			{roomStore.remoteStreams &&
				roomStore.remoteStreams.map((stream) => (
					<Media key={stream.id} media={stream} />
				))}
		</>
	)
}

export default Room2
