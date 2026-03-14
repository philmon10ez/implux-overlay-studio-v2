import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          background: '#f8f9fa',
        }}>
          <div style={{ maxWidth: 480, background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 18 }}>Something went wrong</h1>
            <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
              {this.state.error?.message || String(this.state.error)}
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#888' }}>
              Check the browser console for details.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
