angular.module('app').controller('buytokensController', function($scope, $timeout, $rootScope, $state, exRate,
                                                                 APP_CONSTANTS, $filter) {

    $scope.exRate = exRate.data;
    $scope.wallets = {metamask: [], parity: []};

    if (window['BRWidget']) {
        $timeout(function() {
            var widget = window['BRWidget'].init('bestrate-widget', 'mywish-widget');
            widget.send({
                tokenWithdrawalWallet: $rootScope.currentUser.internal_address,
                email: $filter('isEmail')($rootScope.currentUser.username) ? $rootScope.currentUser.username : undefined
            } , {}, {});
        });
    }

    $scope.copied = {};

    var resetForm = function() {
        $scope.formData = {};
        $scope.amountsValues = {};
    };

    resetForm();

    $scope.visibleForm = 'bnb-wish';

    $scope.$watch('visibleForm', function() {
        resetForm();
    });

    $scope.payDone = function() {
        $state.go($rootScope.currentUser.contracts ? 'main.contracts.list' : 'main.createcontract.types');
    };

    $scope.convertAmountTo = function(toField) {
        var rate = $scope.exRate[toField];
        var currencyValue = new BigNumber($scope.amountsValues.WISH || 0);
        $scope.amountsValues[toField]  = currencyValue.times(rate).round(2).toString(10);
        convertToUSDT();
    };

    $scope.convertAmountFrom = function(fromField) {
        var rate = $scope.exRate[fromField];
        var currencyValue = new BigNumber($scope.amountsValues[fromField] || 0);
        $scope.amountsValues.WISH  = currencyValue.div(rate).round(2).toString(10);
        convertToUSDT();
    };

    var convertToUSDT = function() {
        var rate = $scope.exRate['USDT'];
        var currencyValue = new BigNumber($scope.amountsValues.WISH || 0);
        $scope.amountsValues['USDT']  = currencyValue.times(rate).round(2).toString(10);
    };

}).controller('buyWishByEthController', function($scope, web3Service) {


    $scope.getProvider = function(name) {
        web3Service.setProvider(name, 1);
        return web3Service.web3();
    };

    web3Service.setProvider(name, 1);
    web3Service.getAccounts(1).then(function(response) {
        response.map(function(wallet) {
            $scope.wallets[wallet.type].push(wallet.wallet);
        });
    });

    $scope.sendTransaction = function() {
        $scope.getProvider($scope.formData.activeService).eth.sendTransaction({
            value: new BigNumber($scope.amountsValues['ETH']).times(new BigNumber(10).toPower(18)).toString(10),
            from: $scope.formData.address,
            to: $scope.currentUser.internal_address
        }, function() {
            console.log(arguments);
        });
    };


}).controller('buyWishByBnbController', function($scope, web3Service) {

    $scope.bnbAddress = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52';

    $scope.getProvider = function(name) {
        web3Service.setProvider(name, 1);
        return web3Service.web3();
    };

    web3Service.setProvider(name, 1);
    web3Service.getAccounts(1).then(function(response) {
        response.map(function(wallet) {
            $scope.wallets[wallet.type].push(wallet.wallet);
        });
    });

    $scope.$watch('amountsValues.BNB', function() {
        if (!$scope.amountsValues.BNB) return;
        $scope.checkedTransferData = (new Web3).eth.abi.encodeFunctionCall({
            name: 'transfer',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'to'
            }, {
                type: 'uint256',
                name: 'value'
            }]
        }, [
            $scope.currentUser.internal_address,
            new BigNumber($scope.amountsValues.BNB).times(Math.pow(10, 18)).toString(10)
        ]);
    });

    $scope.sendTransaction = function() {
        $scope.getProvider($scope.formData.activeService).eth.sendTransaction({
            from: $scope.formData.address,
            data: $scope.checkedTransferData,
            to: $scope.bnbAddress
        }).then(console.log);
    };
}).controller('buyWishByWishController', function($scope, $state, $rootScope, APP_CONSTANTS, web3Service) {

    $scope.wishAddress = APP_CONSTANTS.WISH.ADDRESS;

    $scope.getProvider = function(name) {
        web3Service.setProvider(name, 1);
        return web3Service.web3();
    };

    web3Service.setProvider(name, 1);
    web3Service.getAccounts(1).then(function(response) {
        response.map(function(wallet) {
            $scope.wallets[wallet.type].push(wallet.wallet);
        });
    });

    $scope.$watch('amountsValues.WISH', function() {
        if (!$scope.amountsValues.WISH) return;

        $scope.checkedTransferData = (new Web3).eth.abi.encodeFunctionCall({
            name: 'transfer',
            type: 'function',
            inputs: [{
                type: 'address',
                name: 'to'
            }, {
                type: 'uint256',
                name: 'value'
            }]
        }, [
            $scope.currentUser.internal_address,
            new BigNumber($scope.amountsValues.WISH).times(Math.pow(10, 18)).toString(10)
        ]);
    });

    $scope.sendTransaction = function() {
        $scope.getProvider($scope.formData.activeService).eth.sendTransaction({
            from: $scope.formData.address,
            to: APP_CONSTANTS.WISH.ADDRESS,
            data: $scope.checkedTransferData
        }).then(console.log);
    };

});