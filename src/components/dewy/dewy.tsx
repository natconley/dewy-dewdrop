import { useEffect, useRef, useState } from "react";
import "./dewy.css";

type DewyProps = {
    onWave: () => void;
    onPoke: () => void;
}


export default function Dewy({onWave, onPoke}: DewyProps) {
    const [isBlinking, setIsBlinking] = useState(false);
    const [gaze, setGaze] = useState({ x: 0, y: 0 });
    const [isWaving, setIswaving] = useState(false);
    const [isHappy, setIsHappy] = useState(false);
    const [isPoked, setIsPoked] = useState(false);
    const [isPokeBlushing, setIsPokeBlushing] = useState(false);
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
    const touchStart = useRef<{ x: number, y: number } | null>(null);
    const wasSwiping = useRef(false);

    const handleTouchStart = (e: React.PointerEvent<SVGSVGElement>) => {
        if (e.pointerType !== "touch") return;

        wasSwiping.current = false;

        touchStart.current = {
            x: e.clientX,
            y: e.clientY,
        };
    };

    const handleTouchEnd = (e: React.PointerEvent<SVGSVGElement>) => {
        const start = touchStart.current;

        if (e.pointerType !== "touch" || start === null) return;

        const distance = Math.hypot(
            e.clientX - start.x,
            e.clientY - start.y
        );

        if (distance > 15) {
            wasSwiping.current = true;
        }

        touchStart.current = null;
    };

    // poking dewey
    const handlePoke = () => {
        if (isPoked) return;

        setIsPoked(true);

        setTimeout(() => {
            setIsPokeBlushing(true);
        }, 50);
        
        setTimeout(() => {
            setIsPoked(false);
            onPoke();
        }, 800);

        setTimeout(() => {
            setIsPokeBlushing(false);
        }, 1700);

        
    };

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
                    onWave();
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

            if (event.pointerType === "touch" && event.buttons === 0) {
                return;
            }

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

            if (
                (event.pointerType === "touch" && event.buttons > 0) ||
                distance < waveRadius
            ) {
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

        const resetTouch = (event: PointerEvent) => {
            if (event.pointerType !== "touch") return;

            waveTracking.current = {
                lastX: null,
                direction: 0,
                distanceInDirection: 0,
                reversals: 0,
                startedAt: 0,
            };

            lastPointer.current.time = 0;
            targetGaze.current = { x: 0, y: 0 };
            isEngaged.current = false;
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", resetTouch);
        window.addEventListener("pointercancel", resetTouch);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", resetTouch);
            window.addEventListener("pointercancel", resetTouch);
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
  role="button"
  aria-label="Poke Dewy"
  tabIndex={0}
  onPointerDown={handleTouchStart}
  onPointerMove={(e) => {
    const start = touchStart.current;
    if (e.pointerType !== "touch" || !start) return;

    const distance = Math.hypot(
        e.clientX - start.x,
        e.clientY - start.y
    );

    if (distance > 15) {
        wasSwiping.current = true;
    }
  }}
  onPointerUp={handleTouchEnd}
  onPointerCancel={() => {
    touchStart.current = null;
    wasSwiping.current = false;
  }}
  onClick={() => {
    if (wasSwiping.current) {
        wasSwiping.current = false;
        return;
    }

    handlePoke();
  }}

  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handlePoke();
    }
  }}
  
  className={`dewy-svg ${isPoked ? "is-poked" : ""}`}
  viewBox="0 0 2505 1474"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <g clipPath="url(#clip0_3509_2)">
    <g className={`dewy-arm dewy-arm--right ${isWaving ? "is-waving" : ""}`} filter="url(#filter0_i_3509_2)">
      <path d="M2228.74 968.529H1812H1732C1679 968.529 1658 1000.56 1638.5 1044.03C1619 1087.5 1615 1136 1652 1167C1689 1198 1732 1198 1732 1198C1802.5 1190.5 2211 1086 2276.5 1069C2342 1052 2340.67 1074.91 2384.5 1088.5C2491.13 1121.55 2488.51 1013.7 2460 968.53C2424 911.5 2350 962.499 2228.74 968.529Z" fill="url(#paint0_linear_3509_2)" />
    </g>
    <g className="dewy-arm dewy-arm--left" filter="url(#filter1_i_3509_2)">
      <path d="M238.642 1093.25L644.317 997.872L722.194 979.562C773.787 967.432 801.561 993.808 830.492 1031.66C859.423 1069.51 874.416 1115.81 845.495 1154.45C816.573 1193.1 774.714 1202.94 774.714 1202.94C704.369 1211.78 282.795 1203.55 215.143 1201.99C147.491 1200.43 154.031 1222.43 114.473 1245.69C18.241 1302.26 -3.89816 1196.68 13.5186 1146.18C35.5103 1082.43 119.219 1115.14 238.642 1093.25Z" fill="url(#paint1_linear_3509_2)" />
    </g>
    <g className="dewy-body" filter="url(#filter2_ii_3509_2)">
      <path d="M1351.78 29.9113C1312.44 -61.0866 1570.81 154 1655.08 284.647C1744 422.5 1853.19 714 1842.5 861C1817.19 1209 1548.03 1465.41 1186.28 1465.41C824.535 1465.41 619.281 1196.6 619.281 865.014C619.281 533.424 925.781 598.411 1182.78 361.911C1189.57 355.668 1196.38 349.542 1203.23 343.544C1288.08 243.951 1369.75 71.4681 1351.78 29.9113Z" fill="url(#paint2_radial_3509_2)" />
    </g>
    <path className="dewy-mouth" d="M1172 1236C1188.83 1268.17 1235.7 1313.2 1288.5 1236" strokeWidth="15" strokeLinecap="round" stroke="#21577D" />
    <g opacity="0.83" filter="url(#filter3_f_3509_2)">
      <path d="M1008.63 539C848.633 594 723.633 649 708.633 804C701.633 861 710.633 920 730.633 964C726.633 829 770.633 730 858.633 665C909.633 626 969.633 590 1008.63 539Z" fill="url(#paint3_linear_3509_2)" />
    </g>
    <g className={`dewy-blush ${isHappy || isPokeBlushing ? "is-visible" : ""}`}>
      <ellipse cx="1490" cy="1179" rx="151" ry="78" fill="url(#paint4_radial_3509_2)" fillOpacity="0.45" />
      <ellipse cx="990" cy="1179" rx="151" ry="78" fill="url(#paint5_radial_3509_2)" fillOpacity="0.45" />
    </g>
    <g className={`dewy-eye ${isBlinking || isPoked ? "is-blinking" : ""}`}>
      <g className="dewy-eye--right" filter="url(#filter4_i_3509_2)">
        <path d="M1520 981C1520 1087.04 1488.5 1173 1398 1173C1307.5 1173 1276 1087.04 1276 981C1276 874.961 1304.5 789 1398 789C1491.5 789 1520 874.961 1520 981Z" fill="url(#paint6_linear_3509_2)" />
      </g>
      <g className="dewy-gaze" transform={`translate(${gaze.x} ${gaze.y})`}>
        <ellipse className="dewy-highlight dewy-highlight--right" cx="1439" cy="927" rx="41" ry="61" fill="white" />
      </g>
    </g>
    <g className={`dewy-eye ${isBlinking || isPoked ? "is-blinking" : ""}`}>
      <g className="dewy-eye--left" filter="url(#filter5_i_3509_2)">
        <path d="M1184 981C1184 1087.04 1152.5 1173 1062 1173C971.5 1173 940 1087.04 940 981C940 874.961 968.5 789 1062 789C1155.5 789 1184 874.961 1184 981Z" fill="url(#paint7_linear_3509_2)" />
      </g>
      <g className="dewy-gaze" transform={`translate(${gaze.x} ${gaze.y})`}>
        <ellipse className="dewy-highlight dewy-highlight--left" cx="1103" cy="927" rx="41" ry="61" fill="white" />
      </g>
    </g>
  </g>
  <defs >
    <filter id="filter0_i_3509_2" x="1623.91" y="932.789" width="852.934" height="265.211" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="-9" />
      <feGaussianBlur stdDeviation="9" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.0823529 0 0 0 0 0.384314 0 0 0 0 0.639216 0 0 0 0.23 0" />
      <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3509_2" />
    </filter>
    <filter id="filter1_i_3509_2" x="8.08984" y="967.581" width="852.996" height="294.332" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="-9" />
      <feGaussianBlur stdDeviation="9" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.0823529 0 0 0 0 0.384314 0 0 0 0 0.639216 0 0 0 0.23 0" />
      <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3509_2" />
    </filter>
    <filter id="filter2_ii_3509_2" x="595.281" y="-23.8887" width="1256.95" height="1501.3" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dx="-24" dy="-32" />
      <feGaussianBlur stdDeviation="40" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.0784314 0 0 0 0 0.34902 0 0 0 0 0.623529 0 0 0 0.32 0" />
      <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3509_2" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dx="9" dy="12" />
      <feGaussianBlur stdDeviation="9.5" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.913725 0 0 0 0 1 0 0 0 0 1 0 0 0 0.65 0" />
      <feBlend mode="normal" in2="effect1_innerShadow_3509_2" result="effect2_innerShadow_3509_2" />
    </filter>
    <filter id="filter3_f_3509_2" x="703.281" y="536" width="308.352" height="431" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feGaussianBlur stdDeviation="1.5" result="effect1_foregroundBlur_3509_2" />
    </filter>
    <filter id="filter4_i_3509_2" x="1276" y="789" width="244" height="392" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="8" />
      <feGaussianBlur stdDeviation="9" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.00392157 0 0 0 0 0.0588235 0 0 0 0 0.121569 0 0 0 0.45 0" />
      <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3509_2" />
    </filter>
    <filter id="filter5_i_3509_2" x="940" y="789" width="244" height="392" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feFlood floodOpacity="0" result="BackgroundImageFix" />
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
      <feOffset dy="8" />
      <feGaussianBlur stdDeviation="9" />
      <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
      <feColorMatrix type="matrix" values="0 0 0 0 0.00392157 0 0 0 0 0.0588235 0 0 0 0 0.121569 0 0 0 0.45 0" />
      <feBlend mode="normal" in2="shape" result="effect1_innerShadow_3509_2" />
    </filter>
    <linearGradient id="paint0_linear_3509_2" x1="2006" y1="933" x2="2045" y2="1140" gradientUnits="userSpaceOnUse">
      <stop stopColor="#D6F7FF" />
      <stop offset="0.42" stopColor="#97D2F3" />
      <stop offset="1" stopColor="#4E95D5" />
    </linearGradient>
    <linearGradient id="paint1_linear_3509_2" x1="435" y1="994" x2="479" y2="1202" gradientUnits="userSpaceOnUse">
      <stop stopColor="#D6F7FF" />
      <stop offset="0.42" stopColor="#97D2F3" />
      <stop offset="1" stopColor="#4E95D5" />
    </linearGradient>
    <radialGradient id="paint2_radial_3509_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1020.8 445.923) scale(872.857 1040.29)">
      <stop stopColor="#E3FBFF" />
      <stop offset="0.26" stopColor="#B3E5FA" />
      <stop offset="0.62" stopColor="#74BDE9" />
      <stop offset="0.85" stopColor="#4791CE" />
      <stop offset="1" stopColor="#2C6FB1" />
    </radialGradient>
    <linearGradient id="paint3_linear_3509_2" x1="857.457" y1="539" x2="857.457" y2="964" gradientUnits="userSpaceOnUse">
      <stop stopColor="white" stopOpacity="0.82" />
      <stop offset="1" stopColor="#EDFCFF" stopOpacity="0.12" />
    </linearGradient>
    <radialGradient id="paint4_radial_3509_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1490 1179) rotate(90) scale(78 151)">
      <stop stopColor="#FB06C6" stopOpacity="0.44" />
      <stop offset="0.5" stopColor="#E82ACC" stopOpacity="0.382" />
      <stop offset="0.985577" stopColor="#E82ACC" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="paint5_radial_3509_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(990 1179) rotate(90) scale(78 151)">
      <stop stopColor="#FB06C6" stopOpacity="0.44" />
      <stop offset="0.5" stopColor="#E82ACC" stopOpacity="0.382" />
      <stop offset="0.985577" stopColor="#E82ACC" stopOpacity="0" />
    </radialGradient>
    <linearGradient id="paint6_linear_3509_2" x1="1398" y1="789" x2="1398" y2="1293" gradientUnits="userSpaceOnUse">
      <stop stopColor="#15273A" />
      <stop offset="0.5" stopColor="#1F394D" />
      <stop offset="1" stopColor="#40687F" />
    </linearGradient>
    <linearGradient id="paint7_linear_3509_2" x1="1062" y1="789" x2="1062" y2="1293" gradientUnits="userSpaceOnUse">
      <stop stopColor="#15273A" />
      <stop offset="0.5" stopColor="#1F394D" />
      <stop offset="1" stopColor="#40687F" />
    </linearGradient>
    <clipPath id="clip0_3509_2">
      <rect width="2505" height="1474" fill="white" />
    </clipPath>
  </defs>

        </svg>
      </div>
      <div className="dewy-glow" />
    </div>
  );
}
