package com.vidaplena.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class FullScreenNotifPackage : ReactPackage {
    override fun createNativeModules(rc: ReactApplicationContext): List<NativeModule> {
        return listOf(
            FullScreenNotifModule(rc)
        )
    }
    override fun createViewManagers(rc: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
