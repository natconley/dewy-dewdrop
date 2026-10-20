import { useEffect, useRef, useState } from "react";
import "./dewy.css";


export default function Dewy() {
    const [isBlinking, setIsBlinking] = useState(false);
    const [gaze, setGaze] = useState({ x: 0, y: 0 });
    const [isWaving, setIswaving] = useState(false);
    const [isHappy, setIsHappy] = useState(false);
    const targetGaze = useRef({ x: 0, y: 0 });
    const isEngaged = useRef(false);
    const waveTracking = useRef({
        lastX: null as number | null,
        direction: 0,
        distanceInDirection: 0,
        reversals: 0,
        startedAt: 0,
    });
    const lastPointer = useRef({
        x: 0,
        y: 0,
        time: 0,
    });
    const waveCooldown = useRef(0);
    const wavingRef = useRef(false);
    const wavingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // dewy waving timer
    useEffect(() => {
        return () => {
            if (wavingTimeout.current !== null) {
                clearTimeout(wavingTimeout.current);
            }
        };
    }, []);

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

    // respond to user waving
    const respondToWave = () => {
        if (wavingRef.current) return;

        wavingRef.current = true;
        
        setIsHappy(true);
        wavingTimeout.current = setTimeout(() => {
            setIswaving(true);

            wavingTimeout.current = setTimeout(() => {
                setIswaving(false);
                wavingRef.current = false;

                wavingTimeout.current = setTimeout(() => {
                    setIsHappy(false);
                    wavingRef.current = false;
                }, 700);
            }, 1800);
        }, 500);
    };

    // detect user waving
    const detectWave = (x: number) => {
        const now = performance.now();
        const tracking = waveTracking.current;

        const minDistance = 35;
        const maxGestureTime = 1800;
        const requiredReversals = 3;

        if (now < waveCooldown.current) return;

        // First movement for establishing starting point
        if (tracking.lastX === null) {
            tracking.lastX = x;
            tracking.startedAt = now;
            return;
        }

        const movement = x - tracking.lastX;
        tracking.lastX = x;

        //ignoring tiny movements
        if (Math.abs(movement) < 2) return;

        // reset if gesture is taking too long
        if (now -tracking.startedAt > maxGestureTime) {
            tracking.direction = 0;
            tracking.distanceInDirection = 0;
            tracking.reversals = 0;
            tracking.startedAt = now;
        }

        const direction = Math.sign(movement);

        //start tracking first mouse direction
        if (tracking.direction === 0) {
            tracking.direction = direction;
        }

        if (direction === tracking.direction) {
            tracking.distanceInDirection += Math.abs(movement);
        } else {
            if (tracking.distanceInDirection >= minDistance) {
                tracking.reversals++;
                tracking.direction = direction;
                tracking.distanceInDirection = Math.abs(movement);
            }
        }

        if (tracking.reversals >= requiredReversals) {
            console.log("Dewy detected a wave!");

            waveCooldown.current = now + 2500;

            respondToWave();

            waveTracking.current = {
                lastX: null,
                direction: 0,
                distanceInDirection: 0,
                reversals: 0,
                startedAt: 0,
            };
        }
    }

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
                    lastX: null,
                    direction: 0,
                    distanceInDirection: 0,
                    reversals: 0,
                    startedAt: 0,
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

            // cursor is far away, dewy relaxes
            if (distance > trackingRadius || distance === 0) {
                targetGaze.current = { x: 0, y: 0 };
                return;
            }
            
            //detect waves but ignore rapid cursor movement
            const fastMovementThreshold = 0.8;

            if (pointerSpeed > fastMovementThreshold) {
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
        <svg
            role="img"
            aria-label="Dewy the Dewdrop"
            viewBox="0 0 2459 1474"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* ARMS — behind the body */}

            <path
                className={`dewy-arm dewy-arm--right ${isWaving ? "is-waving" : ""}`}
                d="M2207.74 968.53H1791H1711C1658 968.53 1631 1005.06 1631 1044.03C1631 1083 1666.5 1102 1694 1102H1791C1861.5 1094.5 2191.21 1044.03 2256.98 1044.03C2339.19 1044.03 2294.42 1053.26 2338.37 1066.45C2382.33 1079.64 2445 1056.83 2445 1003.42C2445 960.691 2269.87 964.024 2207.74 968.53Z"
                fill="#00CEC9"
            />

            <path
                className="dewy-arm dewy-arm--left"
                d="M226.446 1186.54L598.058 1057.91L669.395 1033.21C716.656 1016.86 753.339 1044.94 766.784 1083.79C780.23 1122.63 755.131 1152.53 730.609 1161.02L644.112 1190.96C578.658 1205.24 267.232 1256.7 208.587 1277C135.28 1302.38 178.385 1297.76 143.742 1324.47C109.099 1351.19 45.3426 1347.8 26.9126 1294.55C12.1687 1251.96 169.488 1201.22 226.446 1186.54Z"
                fill="#00CEC9"
            />

            {/* BODY */}

            <path
                className="dewy-body"
                d="M1330.78 29.9111C1291.44 -61.0868 1541.87 167.336 1634.08 284.646C1716.63 377.569 1783.31 558.073 1820.28 865.014C1820.28 1196.6 1527.03 1465.41 1165.28 1465.41C803.535 1465.41 598.281 1196.6 598.281 865.014C598.281 533.423 904.781 598.411 1161.78 361.911C1168.57 355.668 1175.38 349.542 1182.23 343.544C1267.08 243.951 1348.75 71.4678 1330.78 29.9111Z"
                fill="#81ECEC"
            />

            {/* BLUSH — appears when Dewy is happy */}

            <g className={`dewy-blush ${isHappy ? "is-visible" : ""}`}>
                <ellipse
                    cx="1511"
                    cy="1202"
                    rx="151"
                    ry="78"
                    fill="url(#paint0_radial_3509_2)"
                    fillOpacity="0.45"
                />
                <ellipse
                    cx="946.5"
                    cy="1202"
                    rx="150.5"
                    ry="78"
                    fill="url(#paint1_radial_3509_2)"
                    fillOpacity="0.45"
                />
            </g>

            {/* NORMAL EXPRESSION */}

            <g className="dewy-expression">

                {/* Normal mouth */}
                <path
                    className="dewy-mouth"
                    d="M1151 1236C1167.83 1268.17 1214.7 1313.2 1267.5 1236"
                    strokeWidth="17"
                    stroke="#00807C"
                />

                {/* Right eye */}
                <g className={`dewy-eye ${isBlinking ? "is-blinking" : ""}`}>
                    <path
                        className="dewy-eye--right"
                        d="M1499 981C1499 1087.04 1467.5 1173 1377 1173C1286.5 1173 1255 1087.04 1255 981C1255 874.961 1283.5 789 1377 789C1470.5 789 1499 874.961 1499 981Z"
                        fill="#424242"
                    />
                    <g
                        className="dewy-gaze"
                        transform={`translate(${gaze.x} ${gaze.y})`}
                    >
                        <ellipse
                            className="dewy-highlight dewy-highlight--right"
                            cx="1418"
                            cy="927"
                            rx="41"
                            ry="61"
                            fill="white"
                        />
                    </g>
                </g>

                {/* Left eye */}
                <g className={`dewy-eye ${isBlinking ? "is-blinking" : ""}`}>
                    <path
                        className="dewy-eye--left"
                        d="M1163 981C1163 1087.04 1131.5 1173 1041 1173C950.5 1173 919 1087.04 919 981C919 874.961 947.5 789 1041 789C1134.5 789 1163 874.961 1163 981Z"
                        fill="#424242"
                    />
                    <g
                        className="dewy-gaze"
                        transform={`translate(${gaze.x} ${gaze.y})`}
                    >
                        <ellipse
                            className="dewy-highlight dewy-highlight--left"
                            cx="1082"
                            cy="927"
                            rx="41"
                            ry="61"
                            fill="white"
                        />
                    </g>
                </g>
            </g>

            {/* SHY / HAPPY EXPRESSION */}

            <g className="dewy-expression is-hidden">

                {/* Happy mouth */}
                <path
                    className="dewy-mouth--happy"
                    d="M1140 1210.5C1171 1303 1252 1304 1278 1210.5"
                    strokeWidth="17"
                    stroke="#00807C"
                />

                {/* Left happy eye */}
                <path
                    className="dewy-eye--happy-left"
                    d="M1184 989.5C1184 1075.93 1147.85 1146 1044 1146C940.148 1146 904 1075.93 904 989.5C904 903.067 936.705 833 1044 833C1151.3 833 1184 903.067 1184 989.5Z"
                    fill="#424242"
                />
                <ellipse
                    cx="1091"
                    cy="945.5"
                    rx="47"
                    ry="49.5"
                    fill="white"
                />

                {/* Right happy eye */}
                <path
                    className="dewy-eye--happy-right"
                    d="M1275 990.5C1275 1076.93 1311.15 1147 1415 1147C1518.85 1147 1555 1076.93 1555 990.5C1555 904.067 1522.3 834 1415 834C1307.7 834 1275 904.067 1275 990.5Z"
                    fill="#424242"
                />
                <ellipse
                    cx="1462"
                    cy="939.5"
                    rx="47"
                    ry="49.5"
                    fill="white"
                />
            </g>

            {/* ORIGINAL FIGMA BLUSH GRADIENTS */}

            <defs>
                <radialGradient
                    id="paint0_radial_3509_2"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(1511 1202) rotate(90) scale(78 151)"
                >
                    <stop stopColor="#FB06C6" stopOpacity="0.38" />
                    <stop offset="0.25" stopColor="#E82ACC" stopOpacity="0.382" />
                    <stop offset="0.769231" stopColor="#C076D9" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#81ECEC" stopOpacity="0.23" />
                </radialGradient>

                <radialGradient
                    id="paint1_radial_3509_2"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(946.5 1202) rotate(90) scale(78 150.5)"
                >
                    <stop stopColor="#FB06C6" stopOpacity="0.38" />
                    <stop offset="0.25" stopColor="#E82ACC" stopOpacity="0.382" />
                    <stop offset="0.769231" stopColor="#C076D9" stopOpacity="0.22" />
                    <stop offset="1" stopColor="#81ECEC" stopOpacity="0.23" />
                </radialGradient>
            </defs>
        </svg>
      </div>
      <div className="dewy-glow" />
    </div>
  );
}
