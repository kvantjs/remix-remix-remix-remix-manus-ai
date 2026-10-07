import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="snow">
          <span style={{ ['--i' as any]: 11 }} />
          <span style={{ ['--i' as any]: 12 }} />
          <span style={{ ['--i' as any]: 15 }} />
          <span style={{ ['--i' as any]: 17 }} />
          <span style={{ ['--i' as any]: 18 }} />
          <span style={{ ['--i' as any]: 13 }} />
          <span style={{ ['--i' as any]: 14 }} />
          <span style={{ ['--i' as any]: 19 }} />
          <span style={{ ['--i' as any]: 20 }} />
          <span style={{ ['--i' as any]: 10 }} />
          <span style={{ ['--i' as any]: 18 }} />
          <span style={{ ['--i' as any]: 13 }} />
          <span style={{ ['--i' as any]: 14 }} />
          <span style={{ ['--i' as any]: 19 }} />
          <span style={{ ['--i' as any]: 20 }} />
          <span style={{ ['--i' as any]: 10 }} />
          <span style={{ ['--i' as any]: 18 }} />
          <span style={{ ['--i' as any]: 13 }} />
          <span style={{ ['--i' as any]: 14 }} />
          <span style={{ ['--i' as any]: 19 }} />
          <span style={{ ['--i' as any]: 20 }} />
          <span style={{ ['--i' as any]: 10 }} />
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    position: relative;
    width: 110px;
    height: 30px;
    background: #505050;
    border-radius: 100px;
  }

  .loader::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 10px;
    width: 30px;
    height: 30px;
    background: #505050;
    border-radius: 50%;
    box-shadow: 40px 0 0 20px #505050;
  }

  .snow {
    position: relative;
    display: flex;
    z-index: 1;
  }

  .snow span {
    position: relative;
    width: 3px;
    height: 3px;
    background: #606060;
    margin: 0 2px;
    border-radius: 50%;
    transform-origin: bottom;
  }

  @keyframes snowing {
    0% {
      transform: translateY(0px);
    }

    70% {
      transform: translateY(100px) scale(1);
    }

    100% {
      transform: translateY(100px) scale(0);
    }
  }`;

export default Loader;
