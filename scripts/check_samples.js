const axios = require("axios").default;
const csv = require("fast-csv");
const fs = require("fs");
const config = require("config");
const constants = require("./constants");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
var csvWriter;


var headerFlag = false;


// const writer = fs.createWriteStream('output.csv', {
// 	headers: [
// 		"Organization",
// 		constants.META.STATUS,
// 		constants.META.NUM_ATTEMPTS,
// 		constants.META.QPCR_PREP_TECH,
// 		constants.META.QPCR_PLATE_BC,
// 		constants.META.QPCR_PLATE_WELL_NUM
// 	]
// });

async function login() {
	return axios
		.post(config.get('endpoints.login'), {
			username: config.get('username'),
			password: config.get('password')
		})
		.then((res) => {
			console.log(`Authentication status code: ${res.status}`);
			if (res.status == 200) {
				axios.defaults.headers.common['Authorization'] = res.data.token;
			}
			return res.status;
		})
		.catch((error) => {
			console.log(error);
			return null;
		});
}


async function loadMeta(barcode) {
	
	return axios
		.get(config.get('endpoints.samples') + '?$expand=meta&sampleTypeID=' + config.get('covidSampleTypeId') + '&name=' + barcode)
		.then((res) => {
			var sample = res.data.data;
			if (sample.length !== 0){
				return(sample[0].meta);
			}
			else
				return null;
		})
		.catch((error) => {
			console.log(error);
			return null;
		})
}

async function outputCSV(csvfile) {
	// loadMeta('9999-9999-9999-9998').then((sample) => {
	// 	console.log(sample);
	// })

	await login();

	fs.createReadStream(csvfile)
		.pipe(csv.parse({ 
			headers: true,
			comment: "#",
			skipLines: 2,
		}))
		.on('error', (error) => {
			console.log(error);
			process.exitCode = 8;
		})
		.on('data', (row) => {
			// for (var sample in row){
			// 	console.log(sample.key);
			// }

			let barcode = row[constants.HAMILTON_LOG_HEADERS.SAMPLE_TUBE_BC];
			if (barcode === undefined)
				barcode = row[constants.QPCR_LOG_HEADERS.SAMPLE];
			loadMeta(barcode).then((sample) => {
				// console.log(csvfile);
				console.log(headerFlag);
				if (sample){
					console.log(`${barcode} found: `);
					if (headerFlag === false){
						var header = getHeader(sample);
						csvWriter = createCsvWriter({
							path: 'output.csv',
							header: header
						});
						headerFlag = true;
					}
						var el = makeObject(sample, barcode);
						csvWriter.writeRecords(el);
						console.log(el);
				}
				else {
					console.log(`${row[constants.HAMILTON_LOG_HEADERS.SAMPLE_TUBE_BC]} not found`);
				}
			})
		})
		.on('end', (rowCount) => {
			console.log(`${rowCount} records`);
		})
}


function makeObject(sample, barcode){
	let obj = {};
	obj['name'] = barcode;
	for (var element in sample){
		obj[sample[element].key] = sample[element].value;
	}

	let wrapped = [
		obj
	];

	return wrapped;
};

async function getInfo(csvfile) {
	await login();

	var readfile = fs.createReadStream(csvfile)
			.pipe(csv.parse({
				headers: true,
				comment: "#",
				skipLines: 2 
			}))
	return readfile.on('data', (row) => {
				let barcode = row[constants.HAMILTON_LOG_HEADERS.SAMPLE_TUBE_BC];
				console.log(barcode);
				return barcode;
			})
};

function getHeader(sample){
	let obj = [];
	obj.push({id: 'name', title: "Name"});
	for (var element in sample){
		var arr = {};
		arr['id'] = sample[element].key;
		arr['title'] = sample[element].key;
		obj.push(arr);
	}

	console.log(obj);

	return obj;
};

outputCSV('./test.csv');


