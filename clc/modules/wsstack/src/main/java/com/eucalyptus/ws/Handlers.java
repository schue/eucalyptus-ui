/*******************************************************************************
 * Copyright (c) 2009  Eucalyptus Systems, Inc.
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, only version 3 of the License.
 * 
 * 
 *  This file is distributed in the hope that it will be useful, but WITHOUT
 *  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 *  FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 *  for more details.
 * 
 *  You should have received a copy of the GNU General Public License along
 *  with this program.  If not, see <http://www.gnu.org/licenses/>.
 * 
 *  Please contact Eucalyptus Systems, Inc., 130 Castilian
 *  Dr., Goleta, CA 93101 USA or visit <http://www.eucalyptus.com/licenses/>
 *  if you need additional information or have any questions.
 * 
 *  This file may incorporate work covered under the following copyright and
 *  permission notice:
 * 
 *    Software License Agreement (BSD License)
 * 
 *    Copyright (c) 2008, Regents of the University of California
 *    All rights reserved.
 * 
 *    Redistribution and use of this software in source and binary forms, with
 *    or without modification, are permitted provided that the following
 *    conditions are met:
 * 
 *      Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * 
 *      Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 * 
 *    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 *    IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 *    TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 *    PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 *    OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *    EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *    LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *    NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. USERS OF
 *    THIS SOFTWARE ACKNOWLEDGE THE POSSIBLE PRESENCE OF OTHER OPEN SOURCE
 *    LICENSED MATERIAL, COPYRIGHTED MATERIAL OR PATENTED MATERIAL IN THIS
 *    SOFTWARE, AND IF ANY SUCH MATERIAL IS DISCOVERED THE PARTY DISCOVERING
 *    IT MAY INFORM DR. RICH WOLSKI AT THE UNIVERSITY OF CALIFORNIA, SANTA
 *    BARBARA WHO WILL THEN ASCERTAIN THE MOST APPROPRIATE REMEDY, WHICH IN
 *    THE REGENTS' DISCRETION MAY INCLUDE, WITHOUT LIMITATION, REPLACEMENT
 *    OF THE CODE SO IDENTIFIED, LICENSING OF THE CODE SO IDENTIFIED, OR
 *    WITHDRAWAL OF THE CODE CAPABILITY TO THE EXTENT NEEDED TO COMPLY WITH
 *    ANY SUCH LICENSES OR RIGHTS.
 *******************************************************************************
 * @author chris grzegorczyk <grze@eucalyptus.com>
 */

package com.eucalyptus.ws;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import org.jboss.netty.channel.ChannelHandler;
import org.jboss.netty.handler.codec.http.HttpChunkAggregator;
import org.jboss.netty.handler.timeout.IdleStateHandler;
import org.jboss.netty.handler.timeout.ReadTimeoutHandler;
import org.jboss.netty.handler.timeout.WriteTimeoutHandler;
import org.jboss.netty.util.HashedWheelTimer;
import com.eucalyptus.binding.BindingManager;
import com.eucalyptus.util.Exceptions;
import com.eucalyptus.ws.handlers.BindingHandler;
import com.eucalyptus.ws.handlers.ChannelStateMonitor;
import com.eucalyptus.ws.handlers.NioHttpResponseDecoder;
import com.eucalyptus.ws.handlers.SoapMarshallingHandler;
import com.eucalyptus.ws.handlers.http.NioHttpRequestEncoder;
import com.eucalyptus.ws.protocol.AddressingHandler;
import com.eucalyptus.ws.protocol.SoapHandler;
import com.google.common.collect.Lists;

public class Handlers {
  private static final ChannelHandler                        soapMarshallingHandler = new SoapMarshallingHandler( );
  private static final ChannelHandler                        httpRequestEncoder     = new NioHttpRequestEncoder( );
  private static final ChannelHandler                        soapHandler            = new SoapHandler( );
  private static final ChannelHandler                        addressingHandler      = new AddressingHandler( );
  private static final ConcurrentMap<String, ChannelHandler> bindingHandlers        = new ConcurrentHashMap<String, ChannelHandler>( );
  private static final HashedWheelTimer                      timer                  = new HashedWheelTimer( /**
                                                                                     * 
                                                                                     * TODO:GRZE:
                                                                                     * configurable
                                                                                     **/
                                                                                    );
  
  public static Map<String, ChannelHandler> channelMonitors( final TimeUnit unit, final int timeout ) {
    return new HashMap<String, ChannelHandler>( 4 ) {
      {
        put( "state-monitor", new ChannelStateMonitor( ) );
        put( "idlehandler", new IdleStateHandler( Handlers.timer, timeout, timeout, timeout, unit ) );
        put( "readTimeout", new ReadTimeoutHandler( Handlers.timer, timeout, unit ) );
        put( "writeTimeout", new WriteTimeoutHandler( Handlers.timer, timeout, unit ) );
      }
    };
  }
  
  public static ChannelHandler newHttpResponseDecoder( ) {
    return new NioHttpResponseDecoder( );
  }
  
  public static ChannelHandler newHttpChunkAggregator( int maxContentLength ) {//caching
    return new HttpChunkAggregator( 1024 * 1024 * 20 );
  }
  
  public static ChannelHandler addressingHandler( ) {//caching
    return addressingHandler;
  }
  
  public static ChannelHandler newAddressingHandler( String addressingPrefix ) {//caching
    return new AddressingHandler( addressingPrefix );
  }
  
  public static ChannelHandler bindingHandler( String bindingName ) {
    if ( bindingHandlers.containsKey( bindingName ) ) {
      return bindingHandlers.get( bindingName );
    } else {
      String maybeBindingName = "";
      if ( BindingManager.isRegisteredBinding( bindingName ) ) {
        bindingHandlers.putIfAbsent( bindingName, new BindingHandler( BindingManager.getBinding( bindingName ) ) );
      } else if ( BindingManager.isRegisteredBinding( maybeBindingName = BindingManager.sanitizeNamespace( bindingName ) ) ) {
        bindingHandlers.putIfAbsent( bindingName, new BindingHandler( BindingManager.getBinding( maybeBindingName ) ) );
      } else {
        throw Exceptions.debug( "Failed to find registerd binding for name: " + bindingName + ".  Also tried looking for sanitized name: " + maybeBindingName );
      }
      return bindingHandlers.get( bindingName );
    }
  }
  
  public static ChannelHandler httpRequestEncoder( ) {
    return httpRequestEncoder;
  }
  
  public static ChannelHandler soapMarshalling( ) {
    return soapMarshallingHandler;
  }
  
  public static ChannelHandler soapHandler( ) {
    return soapHandler;
  }
  
}