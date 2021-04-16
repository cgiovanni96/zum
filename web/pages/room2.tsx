// import { Consumer } from 'mediasoup-client/lib/Consumer'
// import { Producer } from 'mediasoup-client/lib/Producer'

import React, { useEffect, useState } from 'react'

const Room2: React.FC = () => {
	return (
		<>
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
