import fs from 'fs';

const bodyParts = [
    // BACK VIEW (POSTERIOR) - Center Axis X = 750
    { id: "neck_post", label: "Neck", view: "back", path: "M720,160 C720,175 735,215 750,220 C765,215 780,175 780,160 C765,165 735,165 720,160 Z" },
    { id: "traps_l", label: "Traps (L)", view: "back", path: "M720,180 C700,185 675,200 660,220 C690,240 730,260 750,280 L750,180 Z" },
    { id: "traps_r", label: "Traps (R)", view: "back", path: "M780,180 C800,185 825,200 840,220 C810,240 770,260 750,280 L750,180 Z" },
    { id: "shoulder_l_post", label: "Shoulder (L)", view: "back", path: "M665,205 C635,210 620,230 608,285 C630,295 655,285 665,280 C667,250 667,220 665,205 Z" },
    { id: "shoulder_r_post", label: "Shoulder (R)", view: "back", path: "M835,205 C865,210 880,230 892,285 C870,295 845,285 835,280 C833,250 833,220 835,205 Z" },
    { id: "lats_l", label: "Lats (L)", view: "back", path: "M660,280 C680,290 730,300 750,300 L750,400 L685,400 C675,360 670,320 660,280 Z" },
    { id: "lats_r", label: "Lats (R)", view: "back", path: "M840,280 C820,290 770,300 750,300 L750,400 L815,400 C825,360 830,320 840,280 Z" },
    { id: "tricep_l", label: "Triceps (L)", view: "back", path: "M608,285 C600,320 603,360 617,375 C630,370 645,350 650,330 C655,310 660,295 660,285 Z" },
    { id: "tricep_r", label: "Triceps (R)", view: "back", path: "M892,285 C900,320 897,360 883,375 C870,370 855,350 850,330 C845,310 840,295 840,285 Z" },
    { id: "forearm_l_post", label: "Forearm (L)", view: "back", path: "M617,375 C595,400 565,450 563,505 C580,510 600,480 615,440 L650,375 Z" },
    { id: "forearm_r_post", label: "Forearm (R)", view: "back", path: "M883,375 C905,400 935,450 937,505 C920,510 900,480 885,440 L850,375 Z" },
    { id: "lower_back", label: "Lower Back", view: "back", path: "M700,400 L800,400 L795,470 L705,470 Z" },
    { id: "glute_l", label: "Gluteus (L)", view: "back", path: "M675,470 L750,470 L750,580 L675,560 C665,530 668,500 675,470 Z" },
    { id: "glute_r", label: "Gluteus (R)", view: "back", path: "M825,470 L750,470 L750,580 L825,560 C835,530 832,500 825,470 Z" },
    { id: "hamstring_l", label: "Hamstrings (L)", view: "back", path: "M675,580 L745,580 L740,740 L685,740 Z" },
    { id: "hamstring_r", label: "Hamstrings (R)", view: "back", path: "M825,580 L755,580 L760,740 L815,740 Z" },
    { id: "calf_l", label: "Calf (L)", view: "back", path: "M685,740 C680,780 685,860 700,920 L740,920 C740,860 735,780 740,740 Z" },
    { id: "calf_r", label: "Calf (R)", view: "back", path: "M815,740 C820,780 815,860 800,920 L760,920 C760,860 765,780 760,740 Z" }
];

function shiftPath(pathStr, dx) {
    // Replace all numbers following M, C, L, Z etc. with shifted numbers
    // Let's do it using regex to find coordinate values
    return pathStr.replace(/([MLC])\s*(-?\d+),(-?\d+)|(-?\d+),(-?\d+)/g, (match, cmd, x, y, x2, y2) => {
        if (cmd) {
            const newX = parseInt(x) + dx;
            return `${cmd}${newX},${y}`;
        } else {
            const newX = parseInt(x2) + dx;
            return `${newX},${y2}`;
        }
    });
}

const shiftedBodyParts = bodyParts.map(bp => {
    return {
        ...bp,
        path: shiftPath(bp.path, 13)
    };
});

shiftedBodyParts.forEach(bp => {
    console.log(`    { \n        id: "${bp.id}", \n        label: "${bp.label}", \n        view: "back", \n        path: "${bp.path}" \n    },`);
});
