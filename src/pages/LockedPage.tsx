import React from "react";

const LockedPage = ({ message }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-6 max-w-md mx-auto p-8">
      <div className="text-6xl font-bold text-muted-foreground">Locked</div>
      <h1 className="text-2xl font-semibold text-foreground">Site Temporarily Locked</h1>
      <p className="text-muted-foreground">
        {message || "The site is currently locked by the administrator. Please check back later."}
      </p>
    </div>
  </div>
);

export default LockedPage;
