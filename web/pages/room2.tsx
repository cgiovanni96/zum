// import { Consumer } from 'mediasoup-client/lib/Consumer'
// import { Producer } from 'mediasoup-client/lib/Producer'

import React, { useEffect, useState } from 'react'
import useRoomStore from '../store/useRoomStore'

const Room2: React.FC = () => {
	const [userName, setUserName] = useState<string>('')
	const roomStore = useRoomStore()

	useEffect(() => {
		setUserName(`nassarolo-${Math.round(Math.random() * 1000)}`)
		roomStore.initializeRoom('123', 'nassa')
	}, [])

	return (
		<>
			<span>{userName} </span>

			<div id="videoMedia" className="hidden">
				<h2>------local------</h2>
				<div id="localMedia"></div>
				{/* <!--<video id="localVideo" autoPlay inline class="vid"></video>--> */}
				{/* <!--<video id="localScreen" autoPlay inline class="vid"></video>--> */}
				<h2>-----remote-----</h2>
				<div id="remoteVideos" className="container"></div>

				<div id="remoteAudios"></div>
			</div>
		</>
	)
}

export default Room2
