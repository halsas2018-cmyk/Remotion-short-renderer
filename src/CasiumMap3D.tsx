import React, {useEffect, useRef, useState} from 'react';
import {
	AbsoluteFill,
	delayRender,
	continueRender,
	cancelRender,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
	Easing,
} from 'remotion';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

type Map3DProps = {
	locationName: string;
	latitude: number;
	longitude: number;
	buildings?: number;
	durationInFrames?: number;
};

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'; // free, no API key

export const CasiumMap3D: React.FC<Map3DProps> = ({
	locationName,
	latitude,
	longitude,
	buildings = 8,
	durationInFrames: propsDurationInFrames,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maplibregl.Map | null>(null);
	const markerRef = useRef<maplibregl.Marker | null>(null);
	const [handle] = useState(() => delayRender('Loading MapLibre map'));
	const frame = useCurrentFrame();
	const {fps, width, height, durationInFrames: videoDurationInFrames} =
		useVideoConfig();
	const durationInFrames = propsDurationInFrames ?? videoDurationInFrames;

	useEffect(() => {
		if (!containerRef.current) return;
		if (!maplibregl) {
			// MapLibre is not available, cancel render with a clear error
			cancelRender(new Error('maplibre-gl is not installed or failed to load'));
			return;
		}

		const map = new maplibregl.Map({
			container: containerRef.current,
			style: MAP_STYLE,
			center: [longitude, latitude],
			zoom: 12,
			attributionControl: false,
			interactive: false,
		});

		map.on('load', () => {
			// Add a marker (pin)
			const marker = new maplibregl.Marker({
				color: '#e86c00',
				scale: 1.2,
			})
				.setLngLat([longitude, latitude])
				.addTo(map);

			markerRef.current = marker;
			mapRef.current = map;
			continueRender(handle);
		});

		map.on('error', (e) => {
			cancelRender(new Error(`MapLibre error: ${e.error?.message ?? 'unknown'}`));
		});

		return () => {
			map.remove();
		};
	}, [handle, latitude, longitude]);

	// Animate zoom/pan based on frame
	useEffect(() => {
		if (!mapRef.current) return;
		const map = mapRef.current;
		const progress = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
		const zoom = interpolate(progress, [0, 0.5, 1], [11, 13, 12], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.bezier(0.16, 1, 0.3, 1),
		});
		const bearing = interpolate(progress, [0, 0.5, 1], [0, 20, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.bezier(0.16, 1, 0.3, 1),
		});
		const pitch = interpolate(progress, [0, 0.5, 1], [0, 45, 0], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.bezier(0.16, 1, 0.3, 1),
		});

		map.easeTo({
			zoom,
			bearing,
			pitch,
			duration: 0,
			essential: true,
		});
	}, [frame, durationInFrames]);

	// Animate marker drop
	useEffect(() => {
		if (!markerRef.current) return;
		const marker = markerRef.current;
		const dropProgress = interpolate(frame, [0, 0.2 * durationInFrames], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.spring({damping: 200}),
		});
		const markerElement = marker.getElement();
		if (markerElement) {
			markerElement.style.transform = `translateY(${(1 - dropProgress) * -80}px)`;
			markerElement.style.opacity = String(dropProgress);
		}
	}, [frame, durationInFrames]);

	return (
		<AbsoluteFill style={{backgroundColor: '#0b0b0b'}}>
			<div
				ref={containerRef}
				style={{
					width,
					height,
					position: 'absolute',
					top: 0,
					left: 0,
				}}
			/>
			{/* Overlay UI */}
			<div
				style={{
					position: 'absolute',
					bottom: 80,
					left: 80,
					right: 80,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					pointerEvents: 'none',
				}}
			>
				<div
					style={{
						background: 'rgba(255,255,255,0.9)',
						borderRadius: 32,
						padding: '24px 48px',
						boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
						backdropFilter: 'blur(8px)',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<div
						style={{
							fontSize: 48,
							fontWeight: 800,
							color: '#1a1a1a',
							letterSpacing: '-0.02em',
						}}
					>
						{locationName}
					</div>
					<div
						style={{
							fontSize: 24,
							color: '#666',
							fontWeight: 500,
						}}
					>
						{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° W
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
