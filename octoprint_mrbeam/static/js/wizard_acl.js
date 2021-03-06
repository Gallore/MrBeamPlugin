$(function() {
    function WizardAclViewModel(parameters) {
        var self = this;

        self.loginStateViewModel = parameters[0];

        self.username = ko.observable(undefined);
        self.password = ko.observable(undefined);
        self.confirmedPassword = ko.observable(undefined);

        self.setup = ko.observable(false);
        self.decision = ko.observable();
        self.hasUserTyped = ko.observable(false);
        self.hasPw2Typed = ko.observable(false);

        // validates email adresses
        self.regexValidateEmail = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        // self.onBeforeWifiConfigure = function() {
        //     return {forwardUrl: 'http://find.mr-beam.org:5000', source: self};
        // }

        self.passwordMismatch = ko.pureComputed(function() {
            return self.password() != self.confirmedPassword();
        });

        self.validUsername = ko.pureComputed(function() {
            return self.regexValidateEmail.test(self.username())
        });

        self.doUserValidation = ko.pureComputed(function() {
            return self.hasUserTyped();
        });

        self.doPwMatchValidation = ko.pureComputed(function() {
            if (self.hasPw2Typed()) {
                return true;
            }
            var len1 = self.password() ? self.password().length : 0;
            var len2 = self.confirmedPassword() ? self.confirmedPassword().length : 0;
            if (len2 > 0 && len2 >= len1) {
                self.hasPw2Typed(true);
            }
            return len2 >= len1;
        });

        self.validPassword = ko.pureComputed(function() {
            return self.password() && self.password().trim() != "";
        });

        self.validData = ko.pureComputed(function() {
            return !self.passwordMismatch() && self.validUsername() && self.validPassword();
        });

        self.onStartup = function(){
            // needs to be scrollable on touch devices
            $('#wizard_dialog .modal-body').addClass('scrollable');
        };

        self.onStartupComplete = function(){
            $('#wizard_plugin_corewizard_acl_input_username').blur(function(){
                self.hasUserTyped(true);
            })
            $('#wizard_plugin_corewizard_acl_input_pw2').blur(function(){
                self.hasPw2Typed(true);
            })

        };

        self.keepAccessControl = function() {
            if (!self.validData()) return;

            var data = {
                "ac": true,
                "user": self.username(),
                "pass1": self.password(),
                "pass2": self.confirmedPassword()
            };
            self._sendData(data);
        };

        self.disableAccessControl = function() {
            var message = gettext("If you disable Access Control <strong>and</strong> your OctoPrint installation is accessible from the internet, your printer <strong>will be accessible by everyone - that also includes the bad guys!</strong>");
            showConfirmationDialog({
                message: message,
                onproceed: function (e) {
                    var data = {
                        "ac": false
                    };
                    self._sendData(data);
                }
            });
        };

        self._sendData = function(data, callback) {
            OctoPrint.postJson("plugin/mrbeam/acl", data)
                .done(function() {
                    self.setup(true);
                    self.decision(data.ac);
                    if (data.ac) {
                        // we now log the user in
                        var user = data.user;
                        var pass = data.pass1;
                        self.loginStateViewModel.login(user, pass, true)
                            .done(function() {
                                if (callback) callback();
                            });
                    } else {
                        if (callback) callback();
                    }
                });
        };

        self.onBeforeWizardTabChange = function(next, current) {
            if (current && _.startsWith(current, "wizard_plugin_corewizard_acl_")) {
                if (self.validData()) {
                    var data = {
                    "ac": true,
                    "user": self.username(),
                    "pass1": self.password(),
                    "pass2": self.confirmedPassword()
                    };
                    self._sendData(data);
                    return true;
                } else {
                    if (!self.validUsername()) {
                        showMessageDialog({
                            title: gettext("Invalid e-mail address"),
                            message: gettext("You need to enter your valid e-mail address.")
                        });
                    } else if (!self.validPassword()) {
                        showMessageDialog({
                            title: gettext("Invalid emtpy password"),
                            message: gettext("You need to enter a valid password.")
                        });
                    } else if (self.passwordMismatch()) {
                        showMessageDialog({
                            title: gettext("Passwords do not match"),
                            message: gettext("Please retype your password.")
                        });
                    }
                    return false;
                }
            }
            return true;
        };

        self.onWizardFinish = function() {
            if (!self.decision()) {
                return "reload";
            }
        };
    }

    OCTOPRINT_VIEWMODELS.push([
        WizardAclViewModel,
        ["loginStateViewModel"],
        "#wizard_plugin_corewizard_acl"
    ]);
});
