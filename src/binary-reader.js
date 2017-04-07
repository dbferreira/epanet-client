let fs = require('fs'),
    Parser = require('binary-parser').Parser;

exports.read = function (binFilePath) {
    return ReadData(binFilePath);
    // .then(res => buildFile(res)); // Compile into text *.inp file
}

function ReadData(binFilePath) {
    return new Promise((resolve, reject) => {
        console.log('reading... ', binFilePath);
        const stats = fs.statSync(binFilePath);
        const fileSizeInBytes = stats.size;
        const res = {};

        fs.open(binFilePath, 'r', (status, fd) => {
            if (status) {
                console.log('STATUS = ', status);
                return;
            }
            const hBufferSize = 84;
            let hBuffer = new Buffer(hBufferSize);
            let header = new Parser()
                .endianess('little')
                .int32('magic')
                .int32('version')
                .skip(4)
                .skip(4)
                .int32('energyResultsOffset')
                .int32('networkResultsOffset')
                .int32('nodeCount')
                .int32('linkCount')
                .int32('pumpCount')
                .int32('qual_type')
                .int32('trace_node')
                .int32('unit_system')
                .int32('flow_units')
                .int32('pressure_units')
                .int32('qual_units')
                .int32('report_statistic')
                .int32('report_start')
                .int32('report_step')
                .int32('num_node_vars')
                .int32('num_link_vars')
                .int32('num_pump_vars');

            let energyUnit = new Parser()
                .endianess('little')
                .int32('index')
                .float('hours_online')
                .float('efficiency')
                .float('avg_kw_per_mgal')
                .float('avg_kwhrs')
                .float('peak_kw')
                .float('avg_cost_per_day');

            let node = new Parser()
                .float('head')
                .float('pressure')
                .float('actual_demand')
                .float('demand_deficit')
                .float('outflow')
                .float('quality');

            let link = new Parser()
                .float('flow')
                .float('leakage')
                .float('velocity')
                .float('head_loss')
                .float('status')
                .float('setting')
                .float('quality');

            fs.read(fd, hBuffer, 0, hBufferSize, 0, (err, bytesRead, hb) => {
                const headerResult = header.parse(hb);
                res.header = headerResult;
                const eBufferSize = headerResult.pumpCount * (4 * 7) + 4;
                let eBuffer = new Buffer(eBufferSize);

                let energy = new Parser()
                    .endianess('little')
                    .array('pumps', {
                        type: energyUnit,
                        length: headerResult.pumpCount
                    })
                    .float('overallPeakEnergy');

                fs.read(fd, eBuffer, 0, eBufferSize, hBufferSize, (err, bytesRead, eb) => {
                    const energyResult = energy.parse(eb);
                    res.energy = energyResult;
                });

                const nBufferSize = headerResult.nodeCount * (4 * 6) + headerResult.linkCount * (4 * 7);
                let nBuffer = new Buffer(nBufferSize);

                let network = new Parser()
                    .endianess('little')
                    .array('nodes', {
                        type: node,
                        length: headerResult.nodeCount
                    })
                    .array('links', {
                        type: link,
                        length: headerResult.linkCount
                    });

                fs.read(fd, nBuffer, 0, nBufferSize, headerResult.networkResultsOffset, (err, bytesRead, nb) => {
                    const networkResult = network.parse(nb);
                    res.network = networkResult;

                    if ((headerResult.networkResultsOffset + nBufferSize) === fileSizeInBytes) {
                        res.epilogue = {};
                    }
                    else {
                        const epBufferSize = fileSizeInBytes - (headerResult.networkResultsOffset + nBufferSize);
                        let epBuffer = new Buffer(epBufferSize);

                        let epilogue = new Parser()
                            .endianess('little')
                            .float('avg_bulk_reaction_rate')
                            .float('avg_wal_reaction_rate')
                            .float('avg_tank_reaction_rate')
                            .float('avg_source_inflow_rate')
                            .int32('reporting_period_count')
                            .int32('warning_flags')
                            .int32('magic_number');

                        fs.read(fd, epBuffer, 0, epBufferSize, headerResult.networkResultsOffset + nBufferSize, (err, bytesRead, epb) => {
                            const epilogueResult = epilogue.parse(epb);
                            res.epilogue = epilogueResult;
                        });
                    }
                    resolve(res);
                });
            });
        });
    });
}