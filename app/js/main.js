'use strict';
angular.module('Directives', []);
angular.module('Services', []);
angular.module('Filters', []);
angular.module('Constants', []);

var module = angular.module('app', ['Constants', 'ui.router', 'Directives', 'Services', 'Filters', 'ngCookies', 'templates', 'datePicker', 'angular-clipboard']);


module.controller('mainMenuController', function($scope, MENU_CONSTANTS) {
    $scope.menuList = MENU_CONSTANTS;
}).controller('baseController', function($scope, $rootScope) {
    $rootScope.toggleMenu = function() {
        $rootScope.showedMenu = !$rootScope.showedMenu;
    };
}).controller('headerController', function($rootScope, $scope) {
}).run(function(APP_CONSTANTS, $rootScope, $window, $timeout, $state, $q, $location, authService, MENU_CONSTANTS) {
    $rootScope.gitHubLink = 'https://github.com/MyWishPlatform/contracts/tree/develop';
    $rootScope.$state = $state;
    $rootScope.numberReplacer = /,/g;
    $rootScope.weiDelta = Math.pow(10, 18);
    $rootScope.setCurrentUser = function(profile) {
        if (!profile) {
            $state.go('exit');
            return;
        }
        $rootScope.currentUser = profile;
        return profile;
    };

    $rootScope.getTemplate = function(template) {
        return APP_CONSTANTS.TEMPLATES.PATH + '/' + template + '.html';
    };
    $rootScope.showMenu = function() {
        $rootScope.openedMenu = true;
    };
    $rootScope.hideMenu = function() {
        $rootScope.openedMenu = false;
    };

    $rootScope.toBack = function() {
        if ($rootScope.currentState.startedPage) {
            return false;
        }
        history.go(-1);
        return true;
    };


    // var currentUserDefer = $q.defer();
    var createDefer = function() {
        $rootScope.currentUserDefer = $q.defer();
    };
    var getCurrentUser = function() {
        return authService.profile().then(function(data) {
            if (data) {
                $rootScope.setCurrentUser(data.data);
                iniApplication();
                $rootScope.currentUserDefer.resolve(data);
            } else {
                return $state.go('exit');
            }
        }, function() {
            $rootScope.currentUserDefer.resolve(false);
            return $state.go('exit');
        });
    };

    createDefer();

    $rootScope.$on("$locationChangeSuccess", function(event, newLocation, oldLocation) {
        $rootScope.currentState = $location.state() || {};

        if (newLocation === oldLocation) return;

        if (!$rootScope.currentState.inHistory) {
            $rootScope.currentState.inHistory = true
        }
        history.replaceState($rootScope.currentState, null);
    });

    var checkCurrentUser = false;

    $rootScope.$on("$stateChangeSuccess", function(event, newLocation, newStateParams, oldLocation, oldStateParams) {
        $rootScope.showedMenu = false;

        var itemFromMenuConst = MENU_CONSTANTS.filter(function(menuItem) {
            return menuItem.route === $state.current.name;
        })[0];
        $rootScope.headerTitle = $state.current.title || (itemFromMenuConst ? itemFromMenuConst['title'] : '');
    });

    $rootScope.$on("$stateChangeStart", function(event, newLocation, newStateParams, oldLocation, oldStateParams) {
        if (oldLocation && (newLocation === oldLocation)) return;
        if (newLocation.name !== 'anonymous') {
            createDefer();
            getCurrentUser();
        }
    });


    var stateHandlersActivate = function() {
        var locationState = $location.state() || {};

        if (!locationState.inHistory) {
            locationState.startedPage = true;
            locationState.inHistory = true
        }
        history.replaceState(locationState, null);
    };

    var initedApp = false;

    var iniApplication = function() {
        if (!initedApp) {
            initedApp = true;
            stateHandlersActivate();
        }
    };

    $rootScope.generateIdenticon = function(address) {
        return blockies.create({
            seed: address,
            size: 8, // width/height of the icon in blocks, default: 8
            scale: 3
        }).toDataURL();
    };

    var offset = moment().utcOffset() / 60;
    $rootScope.currentTimezone = (offset > 0 ? '+' : '') + offset;

}).config(function($httpProvider, $qProvider) {
    $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    $qProvider.errorOnUnhandledRejections(false);
}).filter('declNumber', function($filter) {
    return function(value, words) {
        var float = value % 1;
        value = Math.floor(Math.abs(value));
        var cases = [2, 0, 1, 1, 1, 2];
        return words[float ? 1 : (value % 100 > 4 && value % 100 < 20) ? 2 : cases[(value % 10 < 5) ? value % 10 : 5]];
    }
}).filter('separateNumber', function() {
    return function(val) {
        val = val || '';
        while (/(\d+)(\d{3})/.test(val.toString())){
            val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
        }
        return val;
    }
}).directive('commaseparator', function($filter) {
    'use strict';
    var commaSeparateNumber = $filter('separateNumber');
    return {
        require: 'ngModel',
        scope: {
            commaseparator: '='
        },
        link: function(scope, elem, attrs, ctrl) {
            if (!ctrl) {
                return;
            }
            var oldValue;
            ctrl.$formatters.unshift(function(value) {
                oldValue = value;
                return commaSeparateNumber(ctrl.$modelValue);
            });
            ctrl.$parsers.unshift(function(viewValue) {
                var plainNumber = viewValue.replace(/[\,\.\-\+]/g, '');
                var valid = new RegExp(scope.commaseparator.regexp).test(plainNumber);
                if (!valid) {
                    if (viewValue) {
                        ctrl.$setViewValue(oldValue);
                    }
                }
                if (valid || !plainNumber) {
                    oldValue = plainNumber;
                    if (valid) {
                        elem.val(commaSeparateNumber(plainNumber));
                    } else {
                        elem.val('');
                    }
                    return plainNumber;
                } else {
                    if (oldValue) {
                        elem.val(commaSeparateNumber(oldValue));
                    } else {
                        elem.val('');
                    }
                    return oldValue;
                }
            });

            if (scope.commaseparator.checkWith) {
                ctrl.$parsers.unshift(function(value) {
                    if (!value) return;
                    var plainNumber = value.replace(/[\,\.\-\+]/g, '') * 1;
                    var checkModelValue = scope.commaseparator.fullModel[scope.commaseparator.checkWith];
                    var valid = plainNumber <= checkModelValue;
                    ctrl.$setValidity('check-value', valid);
                    return value;
                });

                ctrl.$formatters.unshift(function(value) {
                    return commaSeparateNumber(ctrl.$modelValue);
                });

                scope.$watch('commaseparator.fullModel.' + scope.commaseparator.checkWith, function() {
                    ctrl.$$parseAndValidate();
                });
            }
        }
    };
});
angular.module("datePicker").run(["$templateCache", function($templateCache) {
    $templateCache.put("templates/datepicker.html",
    '<div ng-switch="view"> <div ng-switch-when="date"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'month\')" ng-bind="date|mFormat:\'YYYY MMMM\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> <tr> <th ng-repeat="day in weekdays" style="overflow: hidden" ng-bind="day|mFormat:\'ddd\':tz"></th> </tr> </thead> <tbody> <tr ng-repeat="week in weeks" ng-init="$index2 = $index"> <td ng-repeat="day in week"> <span ng-class="classes[$index2][$index]" ng-click="selectDate(day)" ng-bind="day|mFormat:\'DD\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="year"> <table> <thead> <tr> <th ng-click="prev(10)">&lsaquo;</th> <th colspan="5" class="switch"ng-bind="years[0].year()+\' - \'+years[years.length-1].year()"></th> <th ng-click="next(10)">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-class="classes[$index]" ng-repeat="year in years" ng-click="selectDate(year)" ng-bind="year.year()"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="month"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'year\')" ng-bind="date|mFormat:\'YYYY\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="month in months" ng-class="classes[$index]" ng-click="selectDate(month)" ng-bind="month|mFormat:\'MMM\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="hours"> <table> <thead> <tr> <th ng-click="prev(24)">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'date\')" ng-bind="date|mFormat:\'DD MMMM YYYY\':tz"></th> <th ng-click="next(24)">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="hour in hours" ng-class="classes[$index]" ng-click="selectDate(hour)" ng-bind="hour|mFormat:\'HH:mm\':tz"></span> </td> </tr> </tbody> </table> </div> <div ng-switch-when="minutes"> <table> <thead> <tr> <th ng-click="prev()">&lsaquo;</th> <th colspan="5" class="switch" ng-click="setView(\'hours\')" ng-bind="date|mFormat:\'DD MMMM YYYY\':tz"></th> <th ng-click="next()">&rsaquo;</i></th> </tr> </thead> <tbody> <tr> <td colspan="7"> <span ng-repeat="minute in minutes" ng-class="classes[$index]" ng-click="selectDate(minute)" ng-bind="minute|mFormat:\'HH:mm\':tz"></span> </td> </tr> </tbody> </table> </div> </div>'
    );
}]);
