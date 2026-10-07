import React from 'react';
import styled from 'styled-components';

const WorkingLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader-wrapper">
        <div className="container">
          <span />
        </div>
        <div className="letter-wrapper">
          <span className="loader-letter">T</span>
          <span className="loader-letter">r</span>
          <span className="loader-letter">a</span>
          <span className="loader-letter">b</span>
          <span className="loader-letter">a</span>
          <span className="loader-letter">l</span>
          <span className="loader-letter">h</span>
          <span className="loader-letter">a</span>
          <span className="loader-letter">n</span>
          <span className="loader-letter">d</span>
          <span className="loader-letter">o</span>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    user-select: none;
    gap: 8px;
  }

  .container {
    border-radius: 50%;
    height: 12px;
    width: 12px;
    animation: rotate_3922 1.2s linear infinite;
    background-color: #9b59b6;
    background-image: linear-gradient(white, white, blue);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container span {
    position: absolute;
    border-radius: 50%;
    height: 100%;
    width: 100%;
    background-color: white;
    background-image: linear-gradient(#4682B4, #4682B4, #4682B4);
    filter: blur(3px);
  }



  @keyframes rotate_3922 {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .letter-wrapper {
    display: flex;
    gap: 0.5px;
  }
  .loader-letter {
    display: inline-block;
    opacity: 0.8;
    z-index: 1;
    border-radius: 50ch;
    border: none;
    font-size: 12px;
    font-weight: 500;
    color: white;
  }
`;

export default WorkingLoader;
