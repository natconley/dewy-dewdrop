import { useEffect, useRef, useState } from "react";
import "./dewy.css";


export default function Dewy() {
    const [isBlinking, setIsBlinking] = useState(false);
    const [gaze, setGaze] = useState({ x: 0, y: 0 });
    const targetGaze = useRef({ x: 0, y: 0 });
    const isEngaged = useRef(false);
    const waveTracking = useRef({
        lastX: 0,
        direction: 0,
        reversals: 0,
        lastReversalX: 0,
        lastReversalTime: 0,
    });
    const lastPointer = useRef({
        x: 0,
        y: 0,
        time: 0,
    });

const waveCooldown = useRef(0);

    // blinking on timer + random time
    useEffect(() => {
        let blinkTimeout: ReturnType<typeof setTimeout>;
        let reopenTimeout: ReturnType<typeof setTimeout>;

        const scheduleBlink = () => {
            const delay = 20000 + Math.random() * 4000;

            blinkTimeout = setTimeout(() => {
                setIsBlinking(true);

                reopenTimeout = setTimeout(() => {
                    setIsBlinking(false);
                    scheduleBlink();
                }, 130);
            }, delay);
        };

        scheduleBlink();

        return () => {
            clearTimeout(blinkTimeout);
            clearTimeout(reopenTimeout);
        };
    }, []);

    // detect user waving
    const detectWave = (x: number) => {
        const now = performance.now();
        const tracking = waveTracking.current;

        const movement = x - tracking.lastX;
        tracking.lastX = x;

        //ignoring tiny movements
        if (Math.abs(movement) < 2) return;

        const direction = Math.sign(movement);

        //start tracking first mouse direction
        if (tracking.direction === 0) {
            tracking.direction = direction;
            tracking.lastReversalX = x;
            tracking.lastReversalTime = now;
            return;
        }

        // detecting change in direction
        if (direction !== tracking.direction) {
            const distance = Math.abs(x - tracking.lastReversalX);

            if (distance >= 35) {
                //reset if too slow
                if (now - tracking.lastReversalTime > 1200) {
                    tracking.reversals = 0;
                }

                tracking.reversals++;
                tracking.lastReversalTime = now;
                tracking.lastReversalX = x;
                tracking.direction = direction;
            }
        }

        if (tracking.reversals >= 3 && now > waveCooldown.current) {
            console.log("dewy detected a wave");

            waveCooldown.current = now + 2500;
            tracking.reversals = 0;
        }
    };

    // eye movement towards cursor
    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            const dewy = document.querySelector(".dewy svg");
            if (!dewy) return;

            const rect = dewy.getBoundingClientRect();

            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const dx = event.clientX - centerX;
            const dy = event.clientY - centerY;
            const distance = Math.hypot(dx, dy);

            // measure pointer speed
            // ignore frantic pointer movement
            const now = performance.now();
            const previous = lastPointer.current;
            const elapsed = now - previous.time;

            // pointerSpeed measured in pixels per millisecond
            const pointerSpeed = 
                previous.time > 0 && elapsed > 0
                    ? Math.hypot(
                        event.clientX - previous.x,
                        event.clientY - previous.y
                    ) / elapsed
                    : 0;

            lastPointer.current = {
                x: event.clientX,
                y: event.clientY,
                time: now,
            };


            // detect gestures before changing the gaze
            const waveRadius = 500;

            if (distance < waveRadius) {
                detectWave(event.clientX);
            } else {
                waveTracking.current = {
                    lastX: 0,
                    direction: 0,
                    reversals: 0,
                    lastReversalX: 0,
                    lastReversalTime: 0,
                };
            }

            // update egagement state
            const interactionRadius = 80;
            const trackingRadius = 600;
            const disengageRadius = interactionRadius + 60;

            // Dewy notices someone approaching
            if (!isEngaged.current && distance < interactionRadius) {
            isEngaged.current = true;
            }

            // Dewy only stops making eye contact once the cursor has moved farther away
            if (isEngaged.current && distance > disengageRadius) {
                isEngaged.current = false;
            }

            // during eyecontact, keep looking forward
            if (isEngaged.current) {
                targetGaze.current = { x: 0, y: 0 };
                return;
            }

            //detect waves but ignore rapid cursor movement
            const fastMovementThreshold = 0.8;

            if (pointerSpeed > fastMovementThreshold) {
            targetGaze.current = { x: 0, y: 0 };
            return;
            }

            // cursor is far away, dewy relaxes
            if (distance > trackingRadius || distance === 0) {
                targetGaze.current = { x: 0, y: 0 };
                return;
            }

            // follow ordinary cursor movement
            const maxLeft = 115;
            const maxRight = 40;
            const maxUp = 55;
            const maxDown = 170;

            const directionX = dx / distance;
            const directionY = dy / distance;

            targetGaze.current = {
            x: directionX * (directionX < 0 ? maxLeft : maxRight),
            y: directionY * (directionY < 0 ? maxUp : maxDown),
            };
        };

        window.addEventListener("pointermove", handlePointerMove);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
        };
    }, []);

    // soft eye react and restore via interpolation
    useEffect(() => {
        let animationFrame: number;

        const animateGaze = () => {
            setGaze((current) => {
                const target = targetGaze.current;

                const smoothing = 0.12;

                const nextX = current.x + (target.x - current.x) * smoothing;
                const nextY = current.y + (target.y - current.y) * smoothing;

                if (
                    Math.abs(target.x - nextX) < 0.1 &&
                    Math.abs(target.y -nextY) < 0.1
                ) {
                    if (current.x === target.x && current.y === target.y) {
                        return current;
                    }

                    return { ...target };
                }

                return { x: nextX, y: nextY };
            });

            animationFrame = requestAnimationFrame(animateGaze);
        };

        animationFrame = requestAnimationFrame(animateGaze);

        return () => cancelAnimationFrame(animationFrame);
    }, []);
    
   

  return (
    <div className="dewy-container">
      <div className="dewy">
        <svg role="img" aria-label="Dewy the Dewdrop" viewBox="0 0 2263 1470" fill="none" xmlns="http://www.w3.org/2000/svg">
        
        <path className="dewy-arm dewy-arm--right" d="M2004.74 966.53H1588V1100C1715.92 1092.53 1988.21 1042.03 2053.98 1042.03C2136.19 1042.03 2091.42 1051.26 2135.37 1064.45C2179.33 1077.64 2242 1054.83 2242 1001.42C2242 958.691 2066.87 962.024 2004.74 966.53Z" fill="#00CEC9"/>
        <path className="dewy-arm dewy-arm--left" d="M221.91 1114.96L646.885 990.981L702.12 1141.89C569.295 1180.93 272.259 1224.9 205.563 1249.31C122.193 1279.83 179.791 1292.7 140.674 1323.93C101.558 1355.16 27.3081 1315.96 5.20439 1255.57C-12.4786 1207.26 157.037 1132.93 221.91 1114.96Z" fill="#00CEC9"/> 
        <path className="dewy-body" d="M1205.78 27.9111C1166.44 -63.0868 1416.87 165.336 1509.08 282.646C1591.63 375.569 1658.31 556.073 1695.28 863.014C1695.28 1194.6 1402.03 1463.41 1040.28 1463.41C678.535 1463.41 473.281 1194.6 473.281 863.014C473.281 531.423 779.781 596.411 1036.78 359.911C1043.57 353.668 1050.38 347.542 1057.23 341.544C1142.08 241.951 1223.75 69.4678 1205.78 27.9111Z" fill="#81ECEC"/>
        <path className="dewy-mouth" d="M1031 1234C1047.83 1266.17 1094.7 1311.2 1147.5 1234" strokeWidth="17" stroke="#00807C"/>
        <g className={`dewy-eye ${isBlinking ? "is-blinking" : ""}`}>
            <path className="dewy-eye--right" d="M1374 979C1374 1085.04 1342.5 1171 1252 1171C1161.5 1171 1130 1085.04 1130 979C1130 872.961 1158.5 787 1252 787C1345.5 787 1374 872.961 1374 979Z" fill="#424242"/>
            <g className="dewy-gaze" transform={`translate(${gaze.x} ${gaze.y})`}>
                <ellipse className="dewy-highlight dewy-highlight--right" cx="1293" cy="925" rx="41" ry="61" fill="white"/>
            </g>
        </g>
        <g className={`dewy-eye ${isBlinking ? "is-blinking" : ""}`}>
        <path className="dewy-eye--left" d="M1038 979C1038 1085.04 1006.5 1171 916 1171C825.5 1171 794 1085.04 794 979C794 872.961 822.5 787 916 787C1009.5 787 1038 872.961 1038 979Z" fill="#424242"/>
        <g className="dewy-gaze" transform={`translate(${gaze.x} ${gaze.y})`}>
            <ellipse className="dewy-highlight dewy-highlight--left" cx="957" cy="925" rx="41" ry="61" fill="white"/>
        </g>
        </g>
        <defs>
        <clipPath id="clip0_3509_2">
        <rect fill="white"/>
        </clipPath>
        </defs>
        </svg>
      </div>
      <div className="dewy-glow" />
    </div>
  );
}
