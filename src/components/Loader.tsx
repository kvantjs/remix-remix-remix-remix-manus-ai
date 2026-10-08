import React from 'react';
import styled from 'styled-components';

interface LoaderProps {
  size?: number;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 14, className }) => {
  const fontSizePx = size / 5.4;
  return (
    <StyledWrapper style={{ fontSize: `${fontSizePx}px` }} className={className}>
      <div className="loader" />
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .loader {
    width: 5.4em;
    height: 5.4em;
    border: 0.4em solid rgb(34, 34, 34);
    border-left-color: #2992f0;
    border-radius: 45%;
    animation: spin 0.7s linear infinite;
    box-sizing: border-box;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export default Loader;
