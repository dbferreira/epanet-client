var pg = require('pg'),
    config = require('./pg-config');

var pool = new pg.Pool(config);

exports.fetch = function (locality) {
    let result = {};
    let client;
    return new Promise((resolve, reject) => {
        pool.connect()
            .then(connectClient => {
                client = connectClient;

                // Select all Nodes
                result.nodes = {};
                return client.query(`
                SELECT  n.*
                FROM "WaterNode_04" n 
                JOIN "WaterNodeMemo_04" d 
                ON d."ID" = n."ID" 
                WHERE d."Locality" = $1 ;
            `, [locality]).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.nodes[r.Node_Code] = r))
            .catch(err => reject('error running query : ' + err))

            // Select all tanks           
            .then(() => {
                result.tanks = {};
                return client.query(`
                SELECT  t.*, d."Volume", d."Top_Water_Level", d."Bottom_Water_Level"             
                FROM "WaterTank_04" t 
                JOIN "WaterTankMemo_04" d 
                ON d."ID" = t."ID" 
                WHERE d."Locality" = $1 ;
            `, [locality]).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.tanks[r.Node_Code] = r))
            .catch(err => reject('error running query : ' + err))

            // Select all pipes
            .then(() => {
                result.pipes = {};
                return client.query(`
                SELECT  p.*
                FROM "WaterPipe_04" p
                JOIN "WaterPipeMemo_04" d
                ON d."ID" = p."ID" 
                WHERE d."Locality" = $1 ;
            `, [locality]).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.pipes[r.Link_Code] = r))
            .catch(err => reject('error running query : ' + err))

            // Select all pumps
            .then(() => {
                result.pumps = {};
                return client.query(`
                SELECT  p.*, d."Power"
                FROM "WaterPump_04" p
                JOIN "WaterPumpMemo_04" d
                ON d."ID" = p."ID" 
                WHERE d."Locality" = $1 ;
            `, [locality]).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.pumps[r.Link_Code] = r))
            .catch(err => reject('error running query : ' + err))

            // Select all curves
            // NOTE: No way to only select a certain region
            .then(() => {
                result.curves = {};
                return client.query(`
                SELECT * FROM "WaterCurve_04"
            `, []).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.curves[r.Curve_No] = r))
            .catch(err => reject('error running query : ' + err))

            // Select all valves
            .then(() => {
                result.valves = {};
                return client.query(`
                SELECT  v.*
                FROM "WaterValve_04" v
                JOIN "WaterValveMemo_04" d
                ON d."ID" = v."ID" 
                WHERE d."Locality" = $1 ;
            `, [locality]).then((res) => res)
            })
            .then(res => res.rows.forEach(r => result.valves[r.Link_Code] = r))
            .catch(err => reject('error running query : ' + err))

            .then(() => {
                // All done, releasing and resolving
                client.release();
                resolve(result);
            })
            .catch(err => {
                reject('error fetching client from pool' + err);
            });
    });
}