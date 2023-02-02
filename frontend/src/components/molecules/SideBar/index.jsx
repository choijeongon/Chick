{
  /* 
    최초 작성자: 최정온
    수정 작성자: 최정온
    최초 작성일: 23.01.29
    수정 작성일: 23.01.30
    
    Ver 1.0.0
    최초 버전
    Ver 1.1.0
    index, setIndex Props 추가
    
    - 사용 예시:
    <SideBar index={index} setIndex={setIndex} />
    */
}

import LogoText from "../../../assets/logo/logo-text.svg";
import SideBarBase from "../../atoms/SideBarBase";
import SideBarBtn from "./../../atoms/SideBarBtn/index";

function SideBar({ index, setIndex }) {
  return (
    <SideBarBase>
      <img src={LogoText} />
      {index == 0 ? (
        <SideBarBtn
          type={"tiger"}
          selected={true}
          onClick={() => setIndex(0)}
        />
      ) : (
        <SideBarBtn
          type={"tiger"}
          selected={false}
          onClick={() => setIndex(0)}
        />
      )}
      {index == 1 ? (
        <SideBarBtn type={"rice"} selected={true} onClick={() => setIndex(1)} />
      ) : (
        <SideBarBtn
          type={"rice"}
          selected={false}
          onClick={() => setIndex(1)}
        />
      )}
    </SideBarBase>
  );
}

export default SideBar;