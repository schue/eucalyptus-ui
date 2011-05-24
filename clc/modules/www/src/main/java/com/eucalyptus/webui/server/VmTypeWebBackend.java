package com.eucalyptus.webui.server;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.log4j.Logger;
import com.eucalyptus.cluster.VmTypes;
import com.eucalyptus.util.EucalyptusCloudException;
import com.eucalyptus.vm.VmType;
import com.eucalyptus.webui.client.service.EucalyptusServiceException;
import com.eucalyptus.webui.client.service.SearchResultFieldDesc;
import com.eucalyptus.webui.client.service.SearchResultFieldDesc.TableDisplay;
import com.eucalyptus.webui.client.service.SearchResultFieldDesc.Type;
import com.eucalyptus.webui.client.service.SearchResultRow;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

public class VmTypeWebBackend {
  
  private static final Logger LOG = Logger.getLogger( VmTypeWebBackend.class );
  
  public static final String NAME = "Name";
  public static final String CPU = "CPU";
  public static final String DISK = "Disk";
  public static final String MEMORY = "Memory";
  
  // Common fields
  public static final ArrayList<SearchResultFieldDesc> COMMON_CONFIG_FIELD_DESCS = Lists.newArrayList( );
  static {
    COMMON_CONFIG_FIELD_DESCS.add( new SearchResultFieldDesc( NAME, NAME, false, "40%", TableDisplay.MANDATORY, Type.TEXT, false, false ) );
    COMMON_CONFIG_FIELD_DESCS.add( new SearchResultFieldDesc( CPU, "CPUs", false, "20%", TableDisplay.MANDATORY, Type.TEXT, true, false ) );
    COMMON_CONFIG_FIELD_DESCS.add( new SearchResultFieldDesc( MEMORY, "Memory (MB)", false, "20%", TableDisplay.MANDATORY, Type.TEXT, true, false ) );
    COMMON_CONFIG_FIELD_DESCS.add( new SearchResultFieldDesc( DISK, "Disk (GB)", false, "20%", TableDisplay.MANDATORY, Type.TEXT, true, false ) );
  }
  
  /**
   * @return VmType info for display
   */
  public static List<SearchResultRow> getVmTypes( ) {
    List<SearchResultRow> rows = Lists.newArrayList( );
    for ( VmType v : VmTypes.list( ) ) {
      SearchResultRow row = new SearchResultRow( );
      serializeVmType( v, row );
      rows.add( row );
    }
    return rows;
  }

  private static void serializeVmType( VmType v, SearchResultRow row ) {
    row.addField( v.getName( ) );
    row.addField( v.getCpu( ) == null ? "" : v.getCpu( ).toString( ) );
    row.addField( v.getMemory( ) == null ? "" : v.getMemory( ).toString( ) );
    row.addField( v.getDisk( ) == null ? "" : v.getDisk( ).toString( ) );
  }
  
  /**
   * Update VmType by UI input.
   * 
   * @param row
   * @throws EucalyptusServiceException
   */
  public static void setVmType( SearchResultRow row ) throws EucalyptusServiceException {
    VmType input = deserializeVmType( row );
    if ( input == null ) {
      throw new EucalyptusServiceException( "Invalid input" );
    }
    Set<VmType> newVms = Sets.newTreeSet( );
    for ( VmType v : VmTypes.list( ) ) {
      if ( v.getName( ).equals( input.getName( ) ) ) {
        newVms.add( input );
      } else {
        newVms.add( v );
      }
    }
    try {
      VmTypes.update( newVms );
    } catch ( EucalyptusCloudException e ) {
      LOG.error( "Failed to update VmType", e );
      throw new EucalyptusServiceException( "Failed to update VmType: " + row, e );
    }
  }

  private static VmType deserializeVmType( SearchResultRow row ) {
    int i = 0;
    String name = row.getField( i++ );
    Integer cpu = null;
    try {
      cpu = Integer.parseInt( row.getField( i++ ) );
    } catch ( Exception e ) {
      LOG.error( "Failed to parse cpu value from UI input for " + name, e );
      return null;
    }
    Integer memory = null;
    try {
      memory = Integer.parseInt( row.getField( i++ ) );
    } catch ( Exception e ) {
      LOG.error( "Failed to parse memory value from UI input for " + name, e );
      return null;
    }
    Integer disk = null;
    try {
      disk = Integer.parseInt( row.getField( i++ ) );
    } catch ( Exception e ) {
      LOG.error( "Failed to parse disk value from UI input for " + name, e );
      return null;
    }
    return new VmType( name, cpu, disk, memory );
  }
}