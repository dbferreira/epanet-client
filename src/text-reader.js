let fs = require('fs');

exports.read = function (filePath, records) {
    return ReadData(filePath, records);
}

function ReadData(filePath, records) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) reject(err);

            const dataString = data.toString('utf8');

            const nodeResultStart = dataString.indexOf('Node Results at');
            const linkResultStart = dataString.indexOf('Link Results at');

            // Find node results
            const nodeString = dataString.substring(nodeResultStart, linkResultStart).split('\r\n');
            for (let i = 5; i < nodeString.length; i++) {
                if (nodeString[i]) {
                    const node = {};
                    [node.key, node.head, node.pressure, node.demand, node.deficit, node.outflow] = nodeString[i].split(' ').filter(e => e);
                    if (node.key) {
                        if (records.nodes[node.key]) records.nodes[node.key].res = node;
                        if (records.tanks[node.key]) records.tanks[node.key].res = node;
                        // else console.log('Still not found... what are you? ', node);
                    }
                }
            }

            // Find link results
            const linkString = dataString.substring(linkResultStart, dataString.length).split('\r\n');
            for (let j = 5; j < linkString.length; j++) {
                const link = {};
                [link.key, link.flowrate, link.leakage, link.velocity, link.headloss, link.status] = linkString[j].split(' ').filter(e => e);
                if (link.key) {
                    if (records.pipes[link.key]) records.pipes[link.key].res = link;
                    if (records.pumps[link.key]) records.pumps[link.key].res = link;
                    if (records.valves[link.key]) records.valves[link.key].res = link;
                    // else console.log('Couldnt find link: ', link);
                }
            }
            // let max = 200;
            // for (var nodeKey in records.pipes) {
            //     max--;
            //     if (max === 0) {
            //         break;
            //     }

            //     console.log(records.pipes[nodeKey]);
            // }

            // console.log(records.pumps);
            resolve(records);
        });
    });
}