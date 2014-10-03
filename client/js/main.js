// TODO: Add the dynamic sort function.

(function (angular) {
	var app = angular.module('MainApp', []);

	function object2Array (originalObject) {
		var finalArray = [],
			attrName;

		for (attrName in originalObject) {
			if (originalObject.hasOwnProperty(attrName)) {
				finalArray.push({
					key: attrName,
					value: originalObject[attrName]
				});
			}
		}

		finalArray.sort(function (el1, el2) {
			if (el1.key==el2.key) return 0;
			return (el1.key.toLowerCase()>el2.key.toLowerCase())?1:-1;
		});

		return finalArray;
	}

	function objectCompressor (originalObject) {
		var finalObject = {},
			attrName,
			subObj,
			attrVal;

		for (attrName in originalObject) {
			if (originalObject.hasOwnProperty(attrName)) {
				attrVal = originalObject[attrName];
				if (angular.isString(attrVal)) {
					finalObject[attrName] = attrVal;
				} else {
					subObj = objectCompressor(attrVal);
					angular.forEach(subObj, function (value, key) {
						finalObject[attrName+'.'+key] = value;
					});
				}
			}
		}

		return finalObject;
	}

	app.service('Model', function ($http) {
		var model = {};
		$http({url:'/get/markets'})
			.success(function(data){
				model.languageList = data;
				model.selectedLanguage = data[0];
			});

		return model;
	});

	app.controller('MainController', function ($scope, Model) {
		$scope.model = Model;
	});

	app.controller('LanguageController', function ($scope, $http, $filter, Model) {
		$scope.model = Model;
		$scope.$watch('model.selectedLanguage', function (newVal) {
			if (!newVal) return;

			$http({url:'/get/market/'+newVal})
				.success(function (data) {
					$scope.dictionary = object2Array(objectCompressor(data));
				});
		});

		$scope.addKey = function () {
			$scope.addItemFormVisible = true;
		};

		$scope.hideNewItemForm = function () {
			$scope.addItemFormVisible = false;
		};

		$scope.addNewKey = function () {
			var postData = {
				dictionary: $scope.model.selectedLanguage,
				key: $scope.newItemKey,
				value: $scope.newItemValue
			};
			$http.post('/addKey', postData)
				.success(function(data){
					$scope.addItemFormVisible = false;
					$scope.newItemKey = '';
					$scope.newItemValue = '';

					$scope.dictionary = object2Array(objectCompressor(data));
					
					alert('added');
				})
				.error(function (data, errorCode) {
					alert(data.msg);
				});
		};

		$scope.deleteItem = function (itemKey) {
			var finalUrl = 'deleteItem/dictionary/:dictionarySymbol/key/:itemKey';
			finalUrl = finalUrl.replace(':dictionarySymbol', $scope.model.selectedLanguage);
			finalUrl = finalUrl.replace(':itemKey', itemKey);
			// console.log('delete', itemKey, finalUrl.replace(':dictionarySymbol', $scope.model.selectedLanguage));
			// for IE
			$http.delete(finalUrl)
				.success(function (data) {
					$scope.dictionary = object2Array(objectCompressor(data));
					console.log('success', data);
					alert('deleted');
				});
		};

		$scope.modifyItem = function (itemKey, oldValue) {
			var finalUrl = 'updateItem/dictionary/:dictionarySymbol/key/:itemKey/newValue/:newValue',
				newValue='asdf';

			newValue = window.prompt('New value:', oldValue);
			if (newValue === null) return;
			
			finalUrl = finalUrl.replace(':dictionarySymbol', $scope.model.selectedLanguage);
			finalUrl = finalUrl.replace(':itemKey', itemKey);
			finalUrl = finalUrl.replace(':newValue', newValue);
			
			$http.put(finalUrl)
				.success(function (data) {
					$scope.dictionary = object2Array(objectCompressor(data));
					console.log('success', data);
					alert('modified');
				});
			console.log('modify', itemKey, finalUrl);
		};

	});

	app.filter('keyFilter', function (Model) {
		return function (originalArray) {
			if (!originalArray) return;
			return originalArray.filter(function(element) {
				return !Model.filterKey || element.key.indexOf(Model.filterKey)>-1;
			});
		};
	});
}) (angular);