import type {AlertButton} from 'react-native';
export const Alert={alert(title:string,message?:string,buttons?:AlertButton[]){
 const text=[title,message].filter(Boolean).join('\n\n');
 if(!buttons||buttons.length<=1){window.alert(text);buttons?.[0]?.onPress?.();return;}
 const action=buttons.find(b=>b.style!=='cancel');
 if(window.confirm(text))action?.onPress?.();else buttons.find(b=>b.style==='cancel')?.onPress?.();
}};
