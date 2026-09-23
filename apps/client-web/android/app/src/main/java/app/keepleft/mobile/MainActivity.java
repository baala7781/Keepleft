package app.keepleft.mobile;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState){registerPlugin(KeepleftRunPlugin.class);super.onCreate(savedInstanceState);}
}
