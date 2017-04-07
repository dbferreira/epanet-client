var pg = require('pg'),
    config = require('./pg-config'),
    fs = require("fs");

var pool = new pg.Pool(config);

exports.write = (records, locality) => {
    const avg2 = (a, b) => (a + b) / 2;
    const getPumpStatus = pump => {
        if (+pump.res.flowrate === 0) return 'REMOVED'; // TODO: Confirm this assumption
        if (pump.res.status.indexOf('OPEN') > -1) return 'ON';
    };
    const getValveStatus = valve => {
        if (+valve.res.flowrate === 0) return 'REMOVED'; // TODO: Confirm this assumption
        return valve.res.status.substr(0, valve.res.status.indexOf('/'));
    };

    // Prepare CSV files
    let nodeContent = '"Locality", "EGL", "Head", "Pressure", "ID", "MetaID"\n';
    let nodeCSVFile = 'c:/Temp/nodes.csv';
    // Insert node results
    // { node: '10245', head: 218.096, pressure: 18.549, demand: 0, deficit: 0, outflow: 0 },
    // EGL = elevation + head
    // Mapping in DB different from column headings from EPANet3 output
    // EGL = head, Head = pressure, Pressure = pressure / (0.1 * 1.02)
    for (let i in records.nodes) {
        const n = records.nodes[i];
        if (n.res) {
            const pressure = (+n.res.pressure / (0.1 * 1.02)) || 0;
            nodeContent += [n.Locality, n.res.head, n.res.pressure, pressure, n.ID.toUpperCase(), n.MetaID].map(m => `"${m}"`).join(',').concat('\n');
        }
    }
    fs.writeFileSync(nodeCSVFile, nodeContent);

    let tankContent = '\n';
    let tankCSVFile = 'c:/Temp/tanks.csv';
    for (let i in records.tanks) {
        const t = records.tanks[i];
        if (t.res) {
            const egl = (+t.res.pressure / (0.1 * 1.02)) || 0;
            tankContent += [t.Locality, t.res.head, t.res.pressure, egl, (-1 * t.res.outflow), t.ID, t.MetaID].map(m => `"${m}"`).join(',').concat('\n');
        }
    }
    fs.writeFileSync(tankCSVFile, tankContent);

    let pipeContent = '\n';
    let pipeCSVFile = 'c:/Temp/pipes.csv';
    for (let j in records.pipes) {
        const p = records.pipes[j];
        if (!p.res) console.log('no res for this pipe! ', p);

        // Node could be either a node or a tank
        const n1 = records.nodes[p.From_Code] || records.tanks[p.From_Code];
        const n2 = records.nodes[p.To_Code] || records.tanks[p.To_Code];
        if (!n1 || !n2) console.log('pipe could not find from or to node: ', p.From_Code, p.To_Code);

        const calc = {
            fromElevation: +n1.Elevation || +n2.Elevation,
            toElevation: +n2.Elevation || +n1.Elevation,
            fromEGL: +n1.res.head,
            toEGL: +n2.res.head,
            fromHead: +n1.res.pressure,
            toHead: +n2.res.pressure,
            fromStaticEGL: +n1.Static_EGL || 0,
            toStaticEGL: +n2.Static_EGL || 0,
            fromStaticHead: +n1.Static_Head || 0,
            toStaticHead: +n2.Static_Head || 0
        }
        // Calculate averages
        calc.avgElevation = avg2(calc.fromElevation, calc.toElevation) || 0;
        calc.avgEGL = avg2(calc.fromEGL, calc.toEGL) || 0;
        calc.avgHead = avg2(calc.fromHead, calc.toHead) || 0;
        calc.avgStaticEGL = avg2(calc.fromStaticEGL, calc.toStaticEGL) || 0;
        calc.avgStaticHead = avg2(calc.fromStaticHead, calc.toStaticHead) || 0;
        calc.headLoss = +p.res.headloss * 0.1 * 1.02;
        calc.energyGradient = calc.headLoss / p.Length;
        pipeContent += [p.Locality, p.res.status, +p.res.flowrate, +p.res.velocity, calc.headLoss, calc.energyGradient, p.MetaID, p.ID, calc.fromElevation, calc.toElevation, calc.fromEGL, calc.toEGL, calc.fromHead, calc.toHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead, calc.avgElevation, calc.avgEGL, calc.avgHead, calc.avgStaticEGL, calc.avgStaticHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead, calc.avgStaticEGL, calc.avgStaticHead].map(m => `"${m}"`).join(',').concat('\n');
    }

    fs.writeFileSync(pipeCSVFile, pipeContent);

    let pumpContent = '\n';
    let pumpCSVFile = 'c:/Temp/pumps.csv';
    for (let j in records.pumps) {
        const p = records.pumps[j];
        if (!p.res) console.log('no res for this pump! ', p);

        const n1 = records.nodes[p.From_Code];
        const n2 = records.nodes[p.To_Code];
        if (!n1 || !n2) console.log('pump could not find from or to node: ', p.From_Code, p.To_Code);
        const calc = {
            fromElevation: +n1.Elevation || +n2.Elevation,
            toElevation: +n2.Elevation || +n1.Elevation,
            fromEGL: +n1.res.head,
            toEGL: +n2.res.head,
            fromHead: +n1.res.pressure,
            toHead: +n2.res.pressure,
            fromStaticEGL: +n1.Static_EGL || 0,
            toStaticEGL: +n2.Static_EGL || 0,
            fromStaticHead: +n1.Static_Head || 0,
            toStaticHead: +n2.Static_Head || 0
        }
        // Calculate averages
        calc.avgElevation = avg2(calc.fromElevation, calc.toElevation) || 0;
        calc.avgEGL = avg2(calc.fromEGL, calc.toEGL) || 0;
        calc.avgHead = avg2(calc.fromHead, calc.toHead) || 0;
        calc.avgStaticEGL = avg2(calc.fromStaticEGL, calc.toStaticEGL) || 0;
        calc.avgStaticHead = avg2(calc.fromStaticHead, calc.toStaticHead) || 0;
        calc.pumpStatus = getPumpStatus(p);
        calc.headLoss = +p.res.headloss * 0.1 * 1.02;
        pumpContent += [p.Locality, calc.pumpStatus, +p.res.flowrate, calc.pumpStatus === 'REMOVED' ? 0 : Math.abs(calc.headLoss), calc.pumpStatus === 'REMOVED' ? 0 : p.Power, p.MetaID, p.ID, calc.fromElevation, calc.toElevation, calc.fromEGL, calc.toEGL, calc.fromHead, calc.toHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead, calc.avgElevation, calc.avgEGL, calc.avgHead, calc.avgStaticEGL, calc.avgStaticHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead].map(m => `"${m}"`).join(',').concat('\n');
    }
    fs.writeFileSync(pumpCSVFile, pumpContent);

    let valveContent = '\n';
    let valveCSVFile = 'c:/Temp/valves.csv';
    for (let j in records.valves) {
        const v = records.valves[j];
        if (!v.res) console.log('no res for this valve! ', v);

        const n1 = records.nodes[v.From_Code];
        const n2 = records.nodes[v.To_Code];
        if (!n1 || !n2) console.log('valve could not find from or to node: ', v.From_Code, v.To_Code);
        const calc = {
            fromElevation: +n1.Elevation || +n2.Elevation,
            toElevation: +n2.Elevation || +n1.Elevation,
            fromEGL: +n1.res.head,
            toEGL: +n2.res.head,
            fromHead: +n1.res.pressure,
            toHead: +n2.res.pressure,
            fromStaticEGL: +n1.Static_EGL || 0,
            toStaticEGL: +n2.Static_EGL || 0,
            fromStaticHead: +n1.Static_Head || 0,
            toStaticHead: +n2.Static_Head || 0
        }
        // Calculate averages
        calc.avgElevation = avg2(calc.fromElevation, calc.toElevation) || 0;
        calc.avgEGL = avg2(calc.fromEGL, calc.toEGL) || 0;
        calc.avgHead = avg2(calc.fromHead, calc.toHead) || 0;
        calc.avgStaticEGL = avg2(calc.fromStaticEGL, calc.toStaticEGL) || 0;
        calc.avgStaticHead = avg2(calc.fromStaticHead, calc.toStaticHead) || 0;
        calc.headLoss = +v.res.headloss * 0.1 * 1.02;
        calc.valveStatus = getValveStatus(v);
        valveContent += [v.Locality, calc.valveStatus, +v.res.flowrate, +v.res.velocity, calc.valveStatus === 'REMOVED' ? 0 : calc.headLoss, v.MetaID, v.ID, calc.fromElevation, calc.toElevation, calc.fromEGL, calc.toEGL, calc.fromHead, calc.toHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead, calc.avgElevation, calc.avgEGL, calc.avgHead, calc.avgStaticEGL, calc.avgStaticHead, calc.fromStaticEGL, calc.toStaticEGL, calc.fromStaticHead, calc.toStaticHead].map(m => `"${m}"`).join(',').concat('\n');
    }
    fs.writeFileSync(valveCSVFile, valveContent);


    return new Promise((resolve, reject) => {
        pool.connect()
            .then(client => {
                client.query(`DELETE FROM "WaterNodeResult_04" WHERE "Locality" = $1`, [locality])
                    .then(() => client.query(`COPY "WaterNodeResult_04" ("Locality", "EGL", "Head", "Pressure", "ID", "MetaID") FROM '${nodeCSVFile}' (FORMAT csv, HEADER, DELIMITER ',')`));

                client.query(`DELETE FROM "WaterTankResult_04" WHERE "Locality" = $1`, [locality])
                    .then(() => client.query(`COPY "WaterTankResult_04" ("Locality", "EGL", "Head", "Pressure", "In_Out_Flow", "ID", "MetaID") FROM '${tankCSVFile}' (FORMAT csv, HEADER, DELIMITER ',')`));

                client.query(`DELETE FROM "WaterPipeResult_04" WHERE "Locality" = $1`, [locality])
                    .then(() => client.query(`COPY "WaterPipeResult_04" ("Locality", "Balanced_Status", "Flow", "Velocity", "Headloss", "Energy_Gradient", "MetaID", "ID",
                            "From_Elevation", "To_Elevation", "From_EGL", "To_EGL", "From_Head", "To_Head", "From_Static_EGL", "To_Static_EGL", "From_Static_Head", "To_Static_Head",
                            "Average_Elevation", "Average_EGL", "Average_Head", "Average_Static_EGL", "Average_Static_Head",
                            "From_Future_Static_EGL", "To_Future_Static_EGL", "From_Future_Static_Head", "To_Future_Static_Head", "Average_Future_Static_EGL", "Average_Future_Static_Head")
                             FROM '${pipeCSVFile}' (FORMAT csv, HEADER, DELIMITER ',')`));


                client.query(`DELETE FROM "WaterPumpResult_04" WHERE "Locality" = $1`, [locality])
                    .then(() => client.query(`COPY "WaterPumpResult_04" ("Locality", "Balanced_Status", "Flow", "Head", "Pump_Power", "MetaID", "ID",
                            "From_Elevation", "To_Elevation", "From_EGL", "To_EGL", "From_Head", "To_Head", "From_Static_EGL", "To_Static_EGL", "From_Static_Head", "To_Static_Head",
                            "Average_Elevation", "Average_EGL", "Average_Head", "Average_Static_EGL", "Average_Static_Head",
                            "From_Future_Static_EGL", "To_Future_Static_EGL", "From_Future_Static_Head", "To_Future_Static_Head")
                             FROM '${pumpCSVFile}' (FORMAT csv, HEADER, DELIMITER ',')`));

                client.query(`DELETE FROM "WaterValveResult_04" WHERE "Locality" = $1`, [locality])
                    .then(() => client.query(`COPY "WaterValveResult_04" ("Locality", "Balanced_Status", "Flow", "Velocity", "Headloss", "MetaID", "ID",
                            "From_Elevation", "To_Elevation", "From_EGL", "To_EGL", "From_Head", "To_Head", "From_Static_EGL", "To_Static_EGL", "From_Static_Head", "To_Static_Head",
                            "Average_Elevation", "Average_EGL", "Average_Head", "Average_Static_EGL", "Average_Static_Head",
                            "From_Future_Static_EGL", "To_Future_Static_EGL", "From_Future_Static_Head", "To_Future_Static_Head")
                             FROM '${valveCSVFile}' (FORMAT csv, HEADER, DELIMITER ',')`));

                client.query(`UPDATE modtrack_tables SET stamp = stamp + 1 where tablename = 'WaterNodeResult_04';`);
                client.query(`UPDATE modtrack_tables SET stamp = stamp + 1 where tablename = 'WaterPipeResult_04';`);
                client.query(`UPDATE modtrack_tables SET stamp = stamp + 1 where tablename = 'WaterPumpResult_04';`);
                client.query(`UPDATE modtrack_tables SET stamp = stamp + 1 where tablename = 'WaterTankResult_04';`);
                client.query(`UPDATE modtrack_tables SET stamp = stamp + 1 where tablename = 'WaterValveResult_04';`)
            })
            .then(() => resolve())
            .catch(err => reject('error running query : ' + err))
    });
}


