import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export default forwardRef(function (props: any, ref) {
  const style = useRef({
    background: '#91e7fc',
    width: 500,
    margin: 'auto',
    padding: 10
  });

  // 暴露给外部 Vue 组件调用的方法
  useImperativeHandle(ref, () => ({
    sayHello() {
      alert('👋 来自 React 的方法！');
      console.log('Vue 调用了 React 的 sayHello 方法！');
    },
    getInfo() {
      return { foo: props.foo, time: Date.now() };
    }
  }));
  return (
    <div style={style.current}>
      这是一个react组件
      <h3>接收值: {props.foo}</h3>
      {props.children}
      <button onClick={props.onClick}>react中的button</button>
    </div>
  );
});
