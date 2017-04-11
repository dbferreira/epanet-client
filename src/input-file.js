exports.build = function (data) {
    // TODO: Ensure that ID / Node code is not longer than 15 characters
    // TODO: Possibly convert elevation + demand scenario to correct format?

    let inputString;
    const orZero = (f) => f || 0;
    return new Promise((resolve, reject) => {
        if (data) {
            // TODO: Get title from data
            inputString = '[TITLE]\n';
            inputString += 'TEST EPANET IMQS\n\n';

            inputString += '[JUNCTIONS]\n';
            inputString += ';ID    Elev  Demand\n';
            for (let k in data.nodes) {
                const n = data.nodes[k];
                inputString += [n.Node_Code, n.Elevation, orZero(n.Output) || '', '\n'].join(' ');
            }

            inputString += '\n[RESERVOIRS]\n';
            inputString += ';ID      Head\n';
            for (let k in data.tanks) {
                const r = data.tanks[k];
                if (r.Node_Type !== 'TANK' && r.Node_Type !== 'GL_TANK' && r.Node_Type !== 'TOWER') // Ignore these types
                    inputString += [r.Node_Code, orZero(r.Ground_Elevation) + orZero(r.Water_Level), '\n'].join(' '); // Head  = Elevation + Water_Level
            }

            inputString += '\n[TANKS]\n';
            inputString += ';ID      Elev.    Init.     Min.     Max.      Diam.    MinVol    VolCurve\n';
            for (let k in data.tanks) {
                const t = data.tanks[k];
                // Only use these types, Only if water level is not 0, i.e. not a reservoir
                if (t.Water_Level > 0 && (t.Node_Type === 'TANK' || t.Node_Type === 'GL_TANK' || t.Node_Type === 'TOWER'))
                    inputString += [t.Node_Code, orZero(t.Ground_Elevation), orZero(t.Water_Level), orZero(t.Bottom_Water_Level - t.Ground_Elevation), orZero(t.Top_Water_Level - t.Ground_Elevation) || orZero(t.Bottom_Water_Level - t.Ground_Elevation) + 10, t.Volume || Math.sqrt(4 * orZero(t.Tsim_Surface_Area) / Math.PI) || 10, orZero(t.Tsim_Time_Pattern_Curve_No) || '10196', '\n'].join(' ');
            }

            inputString += '\n[EMITTERS]\n';
            inputString += ';ID   Flow_Coeff\n';
            for (let k in data.nodes) {
                const n = data.nodes[k];
                if (n.Emitter_Coefficient !== 0)
                    inputString += [n.Node_Code, n.Emitter_Coefficient, '\n'].join(' ');
            }

            inputString += '\n[PIPES]\n';
            inputString += ';ID   Node1   Node2  Length  Diameter  RCoeff LCoeff PipeStatus CV\n';
            for (let k in data.pipes) {
                const p = data.pipes[k];
                if (p.Link_Type === 'PIPE')
                    inputString += [p.Link_Code, p.From_Code, p.To_Code, p.Length, p.Diameter, p.Friction_Coefficient, p.Minor_Loss_Coefficient, p.Pipe_Status, '\n'].join(' ');
                if (p.Link_Type === 'CV')
                    inputString += [p.Link_Code, p.From_Code, p.To_Code, p.Length, p.Diameter, p.Friction_Coefficient, p.Minor_Loss_Coefficient, p.Pipe_Status, 'CV', '\n'].join(' ');
            }

            inputString += '\n[PUMPS]\n';
            inputString += ';ID   HeadNode   TailNode  Properties\n';
            for (let k in data.pumps) {
                const p = data.pumps[k];
                inputString += [p.Link_Code, p.From_Code, p.To_Code, 'POWER ' + p.Power, 'HEAD ' + (p.Curve_No !== 0 ? 'CCurve' + p.Curve_No : ' PCurve' + p.Link_Code), 'SPEED ' + p.Relative_Speed, '\n'].join(' ');

                // NOTE: Ignored 'PATTERN' for pumps (Price / time related)
            }

            inputString += '\n[CURVES]\n';
            inputString += ';ID   Flow   Head\n';
            for (let k in data.pumps) {
                const p = data.pumps[k];
                [1, 2, 3].forEach(i => p['Head_Point' + i] && (inputString += ['PCurve' + p.Link_Code, p['Flow_Point' + i], p['Head_Point' + i], '\n'].join(' ')));
            }
            for (let k in data.curves) {
                const c = data.curves[k];
                for (let j = 1; j <= 20; j++) {
                    if (c['X' + j] === null) break;
                    inputString += ['CCurve' + c.Curve_No, c['X' + j], c['Y' + j], '\n'].join(' ');
                }

                // NOTE: These CCurves seems to be only required when running time-based simulation
            }


            inputString += '\n[VALVES]\n';
            inputString += ';ID   HeadNode   TailNode  Diameter  Type   Setting   LossCoeff\n';
            for (let k in data.valves) {
                const v = data.valves[k];
                switch (v.Link_Type) {
                    case 'PRV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    case 'FCV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    case 'PBV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    case 'PSV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    case 'TCV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    case 'GPV':
                        inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, 'CCurve' + v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), v.Valve_Status, '\n'].join(' ');
                        break;
                    default:
                        break;
                }
                // inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, 'CCurve' + v.Valve_Setting, orZero(v.Minor_Loss_Coefficient), '\n'].join(' ');


                // else inputString += [v.Link_Code, v.From_Code, v.To_Code, orZero(v.Diameter) || 100, v.Link_Type, +v.Valve_Setting * 0.1 * 1.02, orZero(v.Minor_Loss_Coefficient), '\n'].join(' ');

                // NOTE: Possible more complex settings calcs required (takes elevation into consideration) (PRV_EGL_Setting)
            }

            inputString += '\n[PATTERNS]\n';
            inputString += ';ID   Multipliers\n';

            inputString += '\n[STATUS]\n';
            inputString += ';Setting\n';

            inputString += '\n[ENERGY]\n';

            inputString += '\n[CONTROLS]\n';

            inputString += '\n[RULES]\n';

            inputString += '\n[DEMANDS]\n';
            inputString += ';ID   Demand   Pattern\n';

            inputString += '\n[QUALITY]\n';

            inputString += '\n[REACTIONS]\n';

            inputString += '\n[SOURCES]\n';
            inputString += ';NodeID   Type    Strength    Pattern\n';

            // TODO: Add options for model, units, etc.
            inputString += `
[OPTIONS]
UNITS LPS
HEADLOSS_MODEL H-W
QUALITY NONE
QUALITY_UNITS MG/L
VISCOSITY 1
DIFFUSIVITY 1
SPECIFIC GRAVITY 1
MAXIMUM_TRIALS 40
RELATIVE_ACCURACY 0.001
UNBALANCED STOP
DEMAND_PATTERN 1
DEMAND_MULTIPLIER 1
EMITTER_EXPONENT 0.5
QUALITY_TOLERANCE 0.01
DEMAND_MODEL FIXED
LEAKAGE_MODEL NONE
HYDRAULIC_SOLVER GGA
MATRIX_SOLVER SPARSPAK

[REPORT]
STATUS FULL
SUMMARY YES
ENERGY YES
NODES ALL
LINKS ALL
\n`;

            inputString += '[END]\n';
            console.log('file build complete');
            resolve(inputString);
        }
        reject('No data provided');
    })
}
