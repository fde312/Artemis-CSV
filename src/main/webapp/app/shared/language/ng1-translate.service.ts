import { InjectionToken } from '@angular/core';

// Create the injection token
export const NG1TRANSLATE_SERVICE = new InjectionToken<any>('NG1TRANSLATE_SERVICE');

export function ng1ServerFactory(injector: any) {
    // This is the name of the authentication service in the ng1 app
    // Allows us to upgrade the service and use it in the ng5 app
    return injector.get('$translate');
}

// This will get injected as provider within the app.module.ts
export const ng1TranslateService = {
    provide: NG1TRANSLATE_SERVICE,
    useFactory: ng1ServerFactory,
    deps: ['$injector']
};
