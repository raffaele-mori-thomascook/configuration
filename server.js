var fs = require('fs'),
	util = require('util'),
	concat = require('concat-stream'),
	express = require('express');

//configuration
var portNumber = '8080',
	marketFolderUrl = './marketList',
	fileNameRegExp = /^(.+)?\.json$/;

var expressApp = express();

function getMarketList () {
	var fileList = fs.readdirSync(marketFolderUrl);
	var jsonFileList = fileList.reduce(function (resultArray, fileName) {
		var regExpMatch = fileNameRegExp.exec(fileName);
		if (regExpMatch) resultArray.push(regExpMatch[1]);
		return resultArray;
	}, []);

	return jsonFileList;
}

function isEmptyArray (myArray) {
	var notNulElements = myArray.filter(function(element) {
		return element!==null && typeof(element)!='undefined';
	});

	return !notNulElements.length;
}

function isEmptyObj (obj) {
	var key;
	for (key in obj) {
		if (obj.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

expressApp.get('/client', function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	res.end(fs.readFileSync('client/index.html').toString());
});

expressApp.get('/js/:fileName', function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/javascript'});
	res.end(fs.readFileSync('client/js/'+req.params.fileName).toString());
});

expressApp.get('/css/:fileName', function (req, res) {
	res.writeHead(200, {'Content-Type': 'text/css'});
	res.end(fs.readFileSync('client/css/'+req.params.fileName).toString());
});

expressApp.get('/get/markets', function (req, res) {
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(getMarketList()));
});


expressApp.get('/get/market/:marketSymbol', function (req, res) {
	var fileName = marketFolderUrl+'/'+req.params.marketSymbol+'.json';
	var fileContent;
	try {
		fileContent = fs.readFileSync(fileName).toString();
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(fileContent);
	} catch (ex) {
		res.writeHead(404, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({error:404}));
	}
});

expressApp.post('/addKey', function (req, res) {
	var completeData = '';
	req.pipe(concat(function(data){
		var postData = JSON.parse(data.toString()),
			fileName = marketFolderUrl+'/'+postData.dictionary+'.json',
			fileContentStr = fs.readFileSync(fileName).toString(),
			fileContentObj = JSON.parse(fileContentStr),
			keyArray = postData.key.split('.'),
			keyArrayLength = keyArray.length,
			objLevel = fileContentObj,
			formattedJsonOut,
			keyArrayIndex;

		for (keyArrayIndex = 0; keyArrayIndex<keyArrayLength-1; keyArrayIndex++) {
			if (!objLevel[keyArray[keyArrayIndex]]) {
				objLevel[keyArray[keyArrayIndex]] = isNaN(keyArray[keyArrayIndex+1])?{}:[];
			} else {
				if (isNaN(keyArray[keyArrayIndex+1]) ^ !util.isArray(objLevel[keyArray[keyArrayIndex]]) ) {
					res.writeHead(500, {'Content-Type': 'application/json'});
					res.end(JSON.stringify({error: true, code: 500, msg: 'wrong key: you try to sobstitute an array with an object or viceversa'}));
					return;
				}
			}
			objLevel = objLevel[keyArray[keyArrayIndex]];
		}

		if (objLevel[keyArray[keyArrayLength-1]]) {
			res.writeHead(500, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({error: true, code: 500, msg: 'key already exist'}));	
		} else {
			objLevel[keyArray[keyArrayLength-1]] = postData.value;
			formattedJsonOut = JSON.stringify(fileContentObj, null, 2);
			fs.writeFileSync(fileName, formattedJsonOut);
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(formattedJsonOut);
		}

		res.end(formattedJsonOut);
	}));
});

expressApp.delete('/deleteItem/dictionary/:dictionarySymbol/key/:itemKey', function (req, res) {
	var fileName = marketFolderUrl+'/'+req.params.dictionarySymbol+'.json',
		fileContentStr = fs.readFileSync(fileName).toString(),
		fileContentObj = JSON.parse(fileContentStr),
		keyArray = req.params.itemKey.split('.'),
		keyArrayLength = keyArray.length,
		objLevel = fileContentObj,
		formattedJsonOut,
		keyArrayIndex,
		levelArray = [];

	for (keyArrayIndex = 0; keyArrayIndex<keyArrayLength-1; keyArrayIndex++) {
		if (!objLevel[keyArray[keyArrayIndex]]) {
			res.writeHead(500, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({error: true, code: 500, msg: 'The key doesn\'t exist'}));
			return;
		} else {
			levelArray.push(objLevel);
			objLevel = objLevel[keyArray[keyArrayIndex]];
		}
	}

	levelArray.push(objLevel);
	delete objLevel[keyArray[keyArrayIndex]];

	for (keyArrayIndex=levelArray.length-1; keyArrayIndex>0; keyArrayIndex--) {
		if (util.isArray(levelArray[keyArrayIndex])) {
			if (isEmptyArray(levelArray[keyArrayIndex])) {
				delete levelArray[keyArrayIndex-1][keyArray[keyArrayIndex-1]];
			}
		} else {
			if (isEmptyObj(levelArray[keyArrayIndex])) {
				delete levelArray[keyArrayIndex-1][keyArray[keyArrayIndex-1]];
			}
		}		
	}

	formattedJsonOut = JSON.stringify(fileContentObj, null, 2);
	fs.writeFileSync(fileName, formattedJsonOut);
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(formattedJsonOut);
});


expressApp.put('/updateItem/dictionary/:dictionarySymbol/key/:itemKey/newValue/:newValue', function (req, res) {
	var fileName = marketFolderUrl+'/'+req.params.dictionarySymbol+'.json',
		fileContentStr = fs.readFileSync(fileName).toString(),
		fileContentObj = JSON.parse(fileContentStr),
		keyArray = req.params.itemKey.split('.'),
		keyArrayLength = keyArray.length,
		objLevel = fileContentObj,
		formattedJsonOut,
		keyArrayIndex;

	for (keyArrayIndex = 0; keyArrayIndex<keyArrayLength-1; keyArrayIndex++) {
		if (!objLevel[keyArray[keyArrayIndex]]) {
			res.writeHead(500, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({error: true, code: 500, msg: 'The key doesn\'t exist'}));
			return;
		} else {
			objLevel = objLevel[keyArray[keyArrayIndex]];
		}
	}

	objLevel[keyArray[keyArrayLength-1]] = req.params.newValue;
	formattedJsonOut = JSON.stringify(fileContentObj, null, 2);
	fs.writeFileSync(fileName, formattedJsonOut);
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(formattedJsonOut);
});

expressApp.listen(portNumber);

console.log('listen on port '+portNumber);