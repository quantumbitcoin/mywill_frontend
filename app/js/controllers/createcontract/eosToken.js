angular.module('app').controller('eosTokenCreateController', function($scope, contractService, $timeout, $state, $rootScope, NETWORKS_TYPES_CONSTANTS,
                                                                      CONTRACT_TYPES_CONSTANTS, openedContract, $stateParams, EOSService, APP_CONSTANTS) {



    var contract = openedContract && openedContract.data ? openedContract.data : {
        network: $stateParams.network,
        name: 'MyEOSTokenContract ' + ($rootScope.currentUser.contracts + 1),
        contract_details: {
            token_holders: []
        }
    };

    contract.contract_details.eos_contract = undefined;

    $scope.contract = contract;
    $scope.network = contract.network * 1;

    EOSService.createEosChain($scope.network);


    var checkAddressTimeout;
    $scope.checkAddress = function(addressField) {
        addressField.$setValidity('not-checked', false);
        if (!addressField.$viewValue) {
            return;
        }
        checkAddressTimeout ? $timeout.cancel(checkAddressTimeout) : false;
        checkAddressTimeout = $timeout(function() {
            EOSService.checkAddress(addressField.$viewValue).then(function(addressInfo) {
                addressField.$setValidity('not-checked', true);
            });
        }, 500);
    };

    var checkTokenTimeout;
    $scope.checkTokenName = function(tokenShortName) {
        if ($scope.network === 11) return;
        tokenShortName.$setValidity('not-checked', false);
        if (!tokenShortName.$viewValue) {
            return;
        }
        checkTokenTimeout ? $timeout.cancel(checkAddressTimeout) : false;
        checkTokenTimeout = $timeout(function() {
            EOSService.coinInfo(APP_CONSTANTS.EOS_ADDRESS.TOKEN, 'TEST').then(function() {
                tokenShortName.$setValidity('not-checked', true);
            });
        }, 500);
    };

    $scope.resetFormData = function() {
        $scope.request = angular.copy(contract.contract_details);
        $scope.contractName = contract.name;
    };


    var storage = window.localStorage || {};
    $scope.createContract = function() {
        var isWaitingOfLogin = $scope.checkUserIsGhost();
        if (!isWaitingOfLogin) {
            delete storage.draftContract;
            createContract();
            return;
        }
        storage.draftContract = JSON.stringify(generateContractData());
        isWaitingOfLogin.then(function() {
            checkDraftContract(true)
        });
        return true;
    };

    var generateContractData = function() {

        var contractDetails = angular.copy($scope.request);
        contractDetails.decimals = contractDetails.decimals * 1;

        return {
            name: contract.name,
            network: contract.network,
            contract_type: CONTRACT_TYPES_CONSTANTS.EOS_TOKEN,
            contract_details: contractDetails,
            id: contract.id
        };
    };

    var contractInProgress = false;
    var createContract = function() {
        if (contractInProgress) return;
        contractInProgress = true;

        var data = generateContractData();
        contractService[!$scope.editContractMode ? 'createContract' : 'updateContract'](data).then(function(response) {
            $state.go('main.contracts.preview.byId', {id: response.data.id});
        }, function(data) {
            switch(data.status) {
                case 400:
                    switch(data.data.result) {

                    }
                    break;
            }
            contractInProgress = false;
        });
    };
    $scope.editContractMode = !!contract.id;

    $scope.checkMaxTokenSupply = function() {
        $scope.maxSupply = Math.round(4611686018427387903 / Math.pow(10, $scope.request.decimals));
    };

    var checkDraftContract = function(redirect) {
        if (localStorage.draftContract) {
            if (!contract.id) {
                var draftContract = JSON.parse(localStorage.draftContract);
                if (draftContract.contract_type == CONTRACT_TYPES_CONSTANTS.TOKEN) {
                    contract = draftContract;
                }
            }
        }
        $scope.resetFormData();
        if (localStorage.draftContract && !contract.id && !$rootScope.currentUser.is_ghost) {
            $scope.createContract();
        } else if (redirect && !localStorage.draftContract) {
            $state.go('main.contracts.list');
        }
    };
    checkDraftContract();

});